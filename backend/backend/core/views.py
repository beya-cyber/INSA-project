from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Incident, LegalWarrant, AuditLog
from .serializers import IncidentSerializer, LegalWarrantSerializer, AuditLogSerializer
import uuid

class IncidentViewSet(viewsets.ModelViewSet):
    queryset = Incident.objects.all().order_by('-created_at')
    serializer_class = IncidentSerializer

    @action(detail=True, methods=['post'])
    def freeze(self, request, pk=None):
        """Custom endpoint to execute an emergency freeze and log it."""
        incident = self.get_object()
        incident.status = 'SUSPENDED'
        incident.save()
        
        # Create an immutable audit log entry automatically
        AuditLog.objects.create(
            tx_hash=f"0x{uuid.uuid4().hex[:16]}",
            action='EMERGENCY_HOLD_EXECUTED',
            operator=request.user.username if request.user.is_authenticated else 'SYSTEM_AUTO',
            target=incident.target_account
        )
        return Response({'status': 'Account suspended successfully, action logged to audit trail.'})

class WarrantViewSet(viewsets.ModelViewSet):
    queryset = LegalWarrant.objects.all().order_by('-issue_date')
    serializer_class = LegalWarrantSerializer

    @action(detail=True, methods=['post'])
    def execute(self, request, pk=None):
        """Custom endpoint for banks to execute a legal warrant."""
        warrant = self.get_object()
        warrant.status = 'FREEZE EXECUTED'
        warrant.save()
        
        AuditLog.objects.create(
            tx_hash=f"0x{uuid.uuid4().hex[:16]}",
            action='WARRANT_EXECUTED',
            operator=request.user.username if request.user.is_authenticated else 'BANK_PARTNER',
            target=warrant.target_account
        )
        return Response({'status': 'Warrant executed and funds frozen.'})

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Audit logs are strictly Read-Only for compliance."""
    queryset = AuditLog.objects.all().order_by('-timestamp')
    serializer_class = AuditLogSerializer
