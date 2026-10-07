from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, permissions, status, filters
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import (
    IsAuditor, IsINSAAnalyst, IsINSASupervisor, IsPoliceLiaison, RequiresMFA
)
from apps.accounts.models import UserRole
from apps.incidents.models import IncidentReport
from apps.forensics.models import TransactionLedgerEntry

from .models import ActionAuditLog, LegalExportPackage
from .serializers import (
    ActionAuditLogSerializer,
    LegalExportPackageDraftSerializer,
    LegalExportPackageSerializer,
)
from .pdf_exporter import generate_and_hash_pdf
from .services import log_action


class ActionAuditLogListView(generics.ListAPIView):
    """
    Immutable compliance audit trail. Auditors see the full system log;
    Supervisors see only their own actions (per RBAC matrix: 'Inspect
    Action Audit Logs' -> Supervisor: Yes (Own), Auditor: Yes (Full)).
    """
    serializer_class = ActionAuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['action_type', 'status_code']
    search_fields = ['target_entity', 'action_type']
    ordering_fields = ['timestamp']
    ordering = ['-timestamp']

    def get_queryset(self):
        user = self.request.user
        qs = ActionAuditLog.objects.select_related('actor').all()
        if user.role == UserRole.AUDITOR or user.role == UserRole.ADMIN:
            return qs
        if user.role == UserRole.INSA_SUPERVISOR:
            return qs.filter(actor=user)
        return ActionAuditLog.objects.none()


class LegalExportPackageDraftView(generics.CreateAPIView):
    """Analysts draft a legal export package (RBAC: 'Draft')."""
    serializer_class = LegalExportPackageDraftSerializer
    permission_classes = [permissions.IsAuthenticated, IsINSAAnalyst]

    def perform_create(self, serializer):
        serializer.save(generated_by=self.request.user)


class LegalExportPackageApproveAndGenerateView(APIView):
    """
    Supervisor-only, MFA-required. Compiles and renders the tamper-evident
    PDF, hashes it for chain-of-custody, and marks the package approved
    for police retrieval (RBAC: 'Approve').
    """
    permission_classes = [permissions.IsAuthenticated, IsINSASupervisor, RequiresMFA]

    def post(self, request, package_id):
        try:
            package = LegalExportPackage.objects.select_related('report').get(id=package_id)
        except LegalExportPackage.DoesNotExist:
            return Response({'detail': 'Export package not found.'}, status=status.HTTP_404_NOT_FOUND)

        report = package.report
        evidence_files = report.evidence_files.all()
        transaction_hops = TransactionLedgerEntry.objects.filter(report=report).order_by('hop_level')
        audit_entries = ActionAuditLog.objects.filter(target_report_id=report.id).order_by('timestamp')

        pdf_file, pdf_hash = generate_and_hash_pdf(
            report, evidence_files, transaction_hops, audit_entries, package.investigative_notes
        )

        package.pdf_file = pdf_file
        package.package_hash_sha256 = pdf_hash
        package.is_approved = True
        package.approved_by = request.user
        package.approved_at = timezone.now()
        package.save()

        log_action(
            actor=request.user, action_type='EXPORT_COURT_PACKAGE',
            target_report_id=report.id,
            ip_address=request.META.get('REMOTE_ADDR', '0.0.0.0'),
            payload={'package_id': package.id, 'pdf_hash': pdf_hash},
        )

        return Response(LegalExportPackageSerializer(package).data)


class LegalExportPackageDownloadView(APIView):
    """Federal Police CIB liaisons download approved, hash-sealed packages."""
    permission_classes = [permissions.IsAuthenticated, IsPoliceLiaison]

    def get(self, request, package_id):
        try:
            package = LegalExportPackage.objects.get(id=package_id, is_approved=True)
        except LegalExportPackage.DoesNotExist:
            return Response({'detail': 'Approved export package not found.'}, status=status.HTTP_404_NOT_FOUND)

        package.downloaded_by_police.add(request.user)
        log_action(
            actor=request.user, action_type='DOWNLOAD_COURT_PACKAGE',
            target_report_id=package.report_id,
            ip_address=request.META.get('REMOTE_ADDR', '0.0.0.0'),
            payload={'package_id': package.id},
        )
        return Response(LegalExportPackageSerializer(package).data)
