import logging

from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsINSAAnalyst, IsINSASupervisor, IsBankAgent, RequiresMFA
from apps.accounts.models import UserRole
from apps.audit_logs.services import log_action

from .models import AssetFreezeOrder, TelecomEscalationOrder, FreezeOrderStatus
from .serializers import (
    AssetFreezeOrderProposeSerializer,
    AssetFreezeOrderSerializer,
    TelecomEscalationOrderProposeSerializer,
    TelecomEscalationOrderSerializer,
)
from apps.tasks.tasks import execute_bank_freeze_order, execute_telecom_escalation_order

logger = logging.getLogger('ndsir')


def _client_ip(request):
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    return forwarded.split(',')[0].strip() if forwarded else request.META.get('REMOTE_ADDR', '0.0.0.0')


def _mark_report_frozen(report):
    """
    Transitions the underlying IncidentReport to FROZEN once its freeze
    order is genuinely acknowledged as executed - this previously never
    happened anywhere: approving/acknowledging a freeze order updated
    only the AssetFreezeOrder's own status, leaving the report itself
    stuck at whatever status it was in before, which meant a citizen
    checking their case status would never actually see "Frozen" even
    after their money genuinely had been. Idempotent and side-effect-free
    if the report is already FROZEN or in a terminal state.
    """
    from apps.incidents.models import IncidentStatus
    from apps.tasks.tasks import send_status_update_sms_task

    if report.status in (IncidentStatus.CLOSED, IncidentStatus.REJECTED, IncidentStatus.FROZEN):
        return
    report.status = IncidentStatus.FROZEN
    report.save(update_fields=['status'])
    send_status_update_sms_task.delay(str(report.id), IncidentStatus.FROZEN)


class AssetFreezeOrderListCreateView(generics.ListCreateAPIView):
    """
    Analysts propose a freeze; Supervisors approve/execute it separately
    (see AssetFreezeOrderApproveView). This two-step flow enforces the
    RBAC matrix: 'Propose Administrative Freeze' (Analyst) vs
    'Approve & Execute Bank Freeze' (Supervisor only).

    Bank Agents also have read access here (RBAC: 'Acknowledge &
    Confirm Freeze Order' implies they must first be able to *see*
    orders directed at their own institution) - but never write access,
    and their queryset is scoped to their own `organization_code` so
    one bank can never see another bank's hold orders.
    """
    queryset = AssetFreezeOrder.objects.select_related('report').all().order_by('-created_at')

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated(), IsINSAAnalyst()]
        # GET: analysts/supervisors see everything; bank agents see their own institution's orders.
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_insa_staff():
            return qs
        if user.role == UserRole.BANK_AGENT:
            return qs.filter(destination_bank_code=user.organization_code)
        return qs.none()

    def get_serializer_class(self):
        return AssetFreezeOrderProposeSerializer if self.request.method == 'POST' else AssetFreezeOrderSerializer

    def perform_create(self, serializer):
        order = serializer.save(proposed_by=self.request.user, status=FreezeOrderStatus.PROPOSED)
        log_action(
            actor=self.request.user, action_type='PROPOSE_FREEZE',
            target_report_id=order.report_id, ip_address=_client_ip(self.request),
            payload={'order_id': str(order.id), 'account_number': order.account_number},
        )


class AssetFreezeOrderApproveView(APIView):
    """
    Supervisor-only, MFA-required approval endpoint. On approval, the
    order is dispatched asynchronously to EthSwitch via Celery so the
    HTTP response returns immediately while delivery + retries happen
    in the background.
    """
    permission_classes = [permissions.IsAuthenticated, IsINSASupervisor, RequiresMFA]

    def post(self, request, order_id):
        try:
            order = AssetFreezeOrder.objects.get(id=order_id)
        except AssetFreezeOrder.DoesNotExist:
            return Response({'detail': 'Freeze order not found.'}, status=status.HTTP_404_NOT_FOUND)

        if order.status != FreezeOrderStatus.PROPOSED:
            return Response({'detail': f'Order already in status {order.status}.'},
                             status=status.HTTP_409_CONFLICT)

        order.status = FreezeOrderStatus.APPROVED
        order.approved_by = request.user
        order.approved_at = timezone.now()
        order.save(update_fields=['status', 'approved_by', 'approved_at'])

        log_action(
            actor=request.user, action_type='APPROVE_FREEZE',
            target_report_id=order.report_id,
            ip_address=_client_ip(request),
            payload={'order_id': str(order.id)},
        )

        execute_bank_freeze_order.delay(str(order.id))

        return Response(AssetFreezeOrderSerializer(order).data)


class AssetFreezeOrderBankAcknowledgeView(APIView):
    """
    Authenticated, browser-facing acknowledgment endpoint for a human
    bank officer clicking "Acknowledge" in the Hold Orders console.

    This is deliberately separate from BankAcknowledgmentWebhookView
    below: that endpoint is for EthSwitch's own backend to call
    server-to-server (HMAC-signed, no user session), while this one is
    for an authenticated Bank Agent confirming manually through NDSIR's
    own UI once their institution has executed the hold internally.
    """
    permission_classes = [permissions.IsAuthenticated, IsBankAgent]

    def post(self, request, order_id):
        try:
            order = AssetFreezeOrder.objects.get(id=order_id)
        except AssetFreezeOrder.DoesNotExist:
            return Response({'detail': 'Freeze order not found.'}, status=status.HTTP_404_NOT_FOUND)

        if order.destination_bank_code != request.user.organization_code:
            return Response({'detail': 'This order was not issued to your institution.'},
                             status=status.HTTP_403_FORBIDDEN)

        if order.status == FreezeOrderStatus.ACKNOWLEDGED:
            return Response(AssetFreezeOrderSerializer(order).data)

        order.status = FreezeOrderStatus.ACKNOWLEDGED
        order.acknowledged_at = timezone.now()
        order.save(update_fields=['status', 'acknowledged_at'])
        _mark_report_frozen(order.report)

        log_action(
            actor=request.user, action_type='ACKNOWLEDGE_FREEZE',
            target_report_id=order.report_id,
            ip_address=_client_ip(request),
            payload={'order_id': str(order.id), 'bank': order.destination_bank_code},
        )
        logger.info("Bank agent %s acknowledged freeze order %s", request.user.username, order.id)

        return Response(AssetFreezeOrderSerializer(order).data)


class TelecomEscalationOrderListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsINSAAnalyst]
    queryset = TelecomEscalationOrder.objects.select_related('report').all().order_by('-created_at')

    def get_serializer_class(self):
        return (TelecomEscalationOrderProposeSerializer
                if self.request.method == 'POST' else TelecomEscalationOrderSerializer)

    def perform_create(self, serializer):
        order = serializer.save(proposed_by=self.request.user, status=FreezeOrderStatus.PROPOSED)
        log_action(
            actor=self.request.user, action_type='PROPOSE_TELECOM_ESCALATION',
            target_report_id=order.report_id,
            ip_address=_client_ip(self.request),
            payload={'order_id': str(order.id), 'target_value': order.target_value},
        )


class TelecomEscalationOrderApproveView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsINSASupervisor, RequiresMFA]

    def post(self, request, order_id):
        try:
            order = TelecomEscalationOrder.objects.get(id=order_id)
        except TelecomEscalationOrder.DoesNotExist:
            return Response({'detail': 'Telecom escalation order not found.'}, status=status.HTTP_404_NOT_FOUND)

        if order.status != FreezeOrderStatus.PROPOSED:
            return Response({'detail': f'Order already in status {order.status}.'},
                             status=status.HTTP_409_CONFLICT)

        order.status = FreezeOrderStatus.APPROVED
        order.approved_by = request.user
        order.approved_at = timezone.now()
        order.save(update_fields=['status', 'approved_by', 'approved_at'])

        log_action(
            actor=request.user, action_type='APPROVE_TELECOM_ESCALATION',
            target_report_id=order.report_id,
            ip_address=_client_ip(request),
            payload={'order_id': str(order.id)},
        )

        execute_telecom_escalation_order.delay(str(order.id))

        return Response(TelecomEscalationOrderSerializer(order).data)


class BankAcknowledgmentWebhookView(APIView):
    """
    Receives HMAC-signed execution acknowledgments from EthSwitch's own
    backend systems (server-to-server, no user session). For a human
    bank officer acknowledging through the NDSIR console UI, see
    AssetFreezeOrderBankAcknowledgeView above instead.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from .bank_switch import EthSwitchClient

        signature = request.headers.get('X-Signature', '')
        client = EthSwitchClient()
        if not client.verify_bank_acknowledgment_signature(request.body, signature):
            return Response({'detail': 'Invalid signature.'}, status=status.HTTP_401_UNAUTHORIZED)

        order_reference = request.data.get('order_reference')
        try:
            order = AssetFreezeOrder.objects.get(ethswitch_order_reference=order_reference)
        except AssetFreezeOrder.DoesNotExist:
            return Response({'detail': 'Unknown order reference.'}, status=status.HTTP_404_NOT_FOUND)

        order.status = FreezeOrderStatus.ACKNOWLEDGED
        order.acknowledged_at = timezone.now()
        order.save(update_fields=['status', 'acknowledged_at'])
        _mark_report_frozen(order.report)
        logger.info("Bank acknowledged freeze order %s", order_reference)
        return Response({'ok': True})
