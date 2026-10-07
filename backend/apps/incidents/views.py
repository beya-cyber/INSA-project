import hashlib
import logging

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, permissions, status, filters
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsInvestigatorOrAuditorReadOnly, IsCitizen
from apps.integrations.fayda_ekyc import FaydaEKYCClient
from apps.tasks.tasks import run_ocr_pipeline, run_linkage_analysis, send_submission_confirmation

from .models import IncidentReport, EvidenceFile, VictimProfile, IncidentStatus
from .serializers import (
    IncidentReportListSerializer,
    IncidentReportDetailSerializer,
    CitizenIncidentSubmissionSerializer,
    EvidenceUploadSerializer,
    CaseTrackingStatusSerializer,
)

logger = logging.getLogger('ndsir')


class CitizenIncidentSubmissionView(generics.CreateAPIView):
    """
    Public multi-step wizard submission endpoint supporting flexible ID types 
    (Fayda eKYC, Kebele ID, or Passport).
    """
    serializer_class = CitizenIncidentSubmissionSerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'citizen_intake'

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        id_type = data.pop('id_type', 'FAYDA').upper()
        verification_token = data.pop('verification_token')

        # Handle verification dynamically based on ID type
        if id_type == 'FAYDA':
            ekyc_client = FaydaEKYCClient()
            verification = ekyc_client.verify_token(verification_token)
            if not verification.get('verified'):
                return Response(
                    {'detail': 'Identity verification failed. Please retry the Fayda eKYC step.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
            id_hash = verification.get('fayda_id_hash')
            full_name_from_verification = verification.get('full_name')
        else:
            # Alternative valid IDs (Kebele ID or Passport) handled locally
            if not verification_token:
                return Response(
                    {'detail': f'A valid {id_type} reference number is required.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            salt = settings.SECRET_KEY[:16]
            id_hash = hashlib.sha256(f'{salt}:{id_type}:{verification_token}'.encode()).hexdigest()
            full_name_from_verification = None

        victim, _ = VictimProfile.objects.get_or_create(
            phone_number=data.pop('phone_number'),
            defaults={
                'full_name': data.pop('full_name', '') or full_name_from_verification or '',
                'fayda_id_hash': id_hash,
                'is_verified': True,
            },
        )
        if not victim.is_verified:
            victim.is_verified = True
            victim.fayda_id_hash = id_hash
            if not victim.full_name and full_name_from_verification:
                victim.full_name = full_name_from_verification
            victim.save(update_fields=['is_verified', 'fayda_id_hash', 'full_name'])
        
        data.pop('full_name', None)

        report = IncidentReport.objects.create(
            victim=victim, consent_recorded_at=timezone.now(), **data
        )

        send_submission_confirmation.delay(str(report.id))
        run_linkage_analysis.delay(str(report.id))

        return Response(
            {
                'tracking_code': report.tracking_code,
                'status': report.status,
                'message': 'Your report has been received. Save your tracking code to check status.',
            },
            status=status.HTTP_201_CREATED,
        )


class EvidenceUploadView(generics.CreateAPIView):
    """Attaches evidence files to an existing incident report (looked up by
    tracking code) and queues OCR."""
    serializer_class = EvidenceUploadSerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'citizen_intake'
    parser_classes = [MultiPartParser, FormParser]

    def perform_create(self, serializer):
        uploaded_file = self.request.FILES.get('file')
        file_bytes = uploaded_file.read()
        uploaded_file.seek(0)
        file_hash = hashlib.sha256(file_bytes).hexdigest()

        evidence = serializer.save(
            original_filename=uploaded_file.name,
            file_hash_sha256=file_hash,
        )
        run_ocr_pipeline.delay(str(evidence.id))
        logger.info("Evidence uploaded: id=%s report=%s hash=%s", evidence.id, evidence.report_id, file_hash)


class CaseTrackingLookupView(APIView):
    """Public case status lookup by tracking code - no auth required, no PII exposed."""
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'citizen_intake'

    def get(self, request, tracking_code):
        try:
            report = IncidentReport.objects.get(tracking_code=tracking_code)
        except IncidentReport.DoesNotExist:
            return Response({'detail': 'No report found for that tracking code.'},
                            status=status.HTTP_404_NOT_FOUND)
        return Response(CaseTrackingStatusSerializer(report).data)


class IncidentReportListView(generics.ListAPIView):
    """
    INSA Triage Console main dashboard feed - filterable/sortable by
    risk level, date, bank, and status (Frontend Phase 2.3).
    """
    serializer_class = IncidentReportListSerializer
    permission_classes = [permissions.IsAuthenticated, IsInvestigatorOrAuditorReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'incident_type', 'channel', 'assigned_analyst']
    search_fields = ['tracking_code', 'scammer_phone_number', 'scammer_identifier']
    ordering_fields = ['risk_score', 'created_at', 'status']
    ordering = ['-risk_score', '-created_at']
    queryset = IncidentReport.objects.select_related('victim', 'assigned_analyst').all()


class IncidentReportDetailView(generics.RetrieveUpdateAPIView):
    """Side-by-side evidence visualizer backing endpoint (Frontend Phase 2.3)."""
    serializer_class = IncidentReportDetailSerializer
    permission_classes = [permissions.IsAuthenticated, IsInvestigatorOrAuditorReadOnly]
    queryset = IncidentReport.objects.select_related('victim').prefetch_related('evidence_files').all()
    lookup_field = 'id'
