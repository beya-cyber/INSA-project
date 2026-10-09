import hashlib
import logging

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, permissions, serializers, status, filters
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.accounts.permissions import IsInvestigatorOrAuditorReadOnly, IsCitizen
from apps.integrations.sms_gateway import SMSGatewayClient, SMSGatewayError
from apps.tasks.tasks import run_ocr_pipeline, run_linkage_analysis, send_submission_confirmation

from . import otp
from .models import IncidentReport, EvidenceFile, VictimProfile, IncidentStatus
from .serializers import (
    IncidentReportListSerializer,
    IncidentReportDetailSerializer,
    CitizenIncidentSubmissionSerializer,
    EvidenceUploadSerializer,
    CaseTrackingStatusSerializer,
)

logger = logging.getLogger('ndsir')


def _otp_dev_mode():
    return bool(settings.DEBUG or getattr(settings, 'OTP_DEV_MODE', False))


class OtpRequestView(APIView):
    """
    Step 1 of citizen verification: texts a 6-digit code to the phone (valid 5 min).
    Throttled per IP (citizen_intake) AND per phone number (3 requests / 15 min).
    In DEBUG / OTP_DEV_MODE the code is also returned as `dev_code` for testers.
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = []  # a stale JWT in the browser must never break a public endpoint
    throttle_classes = [ScopedRateThrottle, otp.PhoneOtpRequestThrottle]
    throttle_scope = 'citizen_intake'

    def post(self, request):
        phone = otp.normalize_phone(request.data.get('phone'))
        if not phone:
            raise serializers.ValidationError({'phone': [otp.ET_MOBILE_MESSAGE]})

        try:
            code = otp.issue_code(phone)
        except Exception:  # cache/Redis unavailable
            logger.exception('OTP issue failed (cache unavailable?)')
            return Response({'detail': 'Verification service is temporarily unavailable. Please try again shortly.'},
                            status=status.HTTP_503_SERVICE_UNAVAILABLE)

        sms = SMSGatewayClient()
        if sms.is_configured():
            try:
                sms.send_sms(phone, f'NDSIR verification code: {code}. Valid for 5 minutes. Never share this code.')
            except SMSGatewayError:
                return Response({'detail': 'We could not send the SMS. Please try again.'},
                                status=status.HTTP_502_BAD_GATEWAY)
        elif not _otp_dev_mode():
            logger.error('OTP requested but SMS gateway is not configured and OTP_DEV_MODE is off.')
            return Response({'detail': 'SMS delivery is not available right now.'},
                            status=status.HTTP_503_SERVICE_UNAVAILABLE)

        body = {'sent': True, 'expires_in': settings.OTP_TTL_SECONDS}
        if _otp_dev_mode():
            body['dev_code'] = code
        return Response(body, status=status.HTTP_200_OK)


class OtpVerifyView(APIView):
    """Step 2: exchange phone + code for a signed, single-use, 15-minute verification_token."""
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_scope = 'citizen_intake'

    def post(self, request):
        phone = otp.normalize_phone(request.data.get('phone'))
        code = str(request.data.get('code') or '').strip()
        if not phone:
            raise serializers.ValidationError({'phone': [otp.ET_MOBILE_MESSAGE]})
        if not (code.isdigit() and len(code) == settings.OTP_CODE_LENGTH):
            raise serializers.ValidationError({'code': [f'Enter the {settings.OTP_CODE_LENGTH}-digit code.']})

        try:
            ok, reason = otp.check_code(phone, code)
        except Exception:
            logger.exception('OTP verify failed (cache unavailable?)')
            return Response({'detail': 'Verification service is temporarily unavailable. Please try again shortly.'},
                            status=status.HTTP_503_SERVICE_UNAVAILABLE)
        if not ok:
            messages = {
                'expired': 'That code has expired. Request a new one.',
                'locked': 'Too many wrong attempts. Request a new code.',
                'invalid': 'Incorrect code. Please check the SMS and try again.',
            }
            raise serializers.ValidationError({'code': [messages[reason]]})

        return Response({'verified': True, 'verification_token': otp.make_verification_token(phone)})


class CitizenIncidentSubmissionView(generics.CreateAPIView):
    """
    Public wizard submission. Identity = phone ownership proven by the OTP flow
    (`verification_token`); a national ID is optional and, if given, is stored only as a salted hash.
    """
    serializer_class = CitizenIncidentSubmissionSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_scope = 'citizen_intake'

    OPTIONAL_LABELS = {
        'national_id': 'national ID', 'description': 'narrative', 'amount': 'amount',
        'transaction_id': 'transaction ID', 'scammer_phone_number': "scammer's phone",
        'scammer_identifier': "scammer's account", 'source_bank': 'source bank',
        'source_account': 'source account', 'target_platform': 'target platform',
    }

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)

        full_name = data.pop('full_name')
        phone = data.pop('phone_number')
        id_type = data.pop('id_type')
        national_id = data.pop('national_id', '')
        token = data.pop('verification_token')
        extras = {k: data.pop(k, None) for k in ('amount', 'transaction_id', 'source_bank', 'source_account', 'target_platform')}

        provided = {k for k in self.OPTIONAL_LABELS
                    if (extras.get(k) if k in extras else (national_id if k == 'national_id' else data.get(k))) not in (None, '')}

        # Atomically spend the token: one phone verification files one report.
        if not otp.consume_verification_token(token):
            raise serializers.ValidationError({'verification_token': ['This phone verification was already used. Please verify again.']})

        id_hash = None
        if national_id:
            salt = settings.SECRET_KEY[:16]
            id_hash = hashlib.sha256(f'{salt}:{id_type}:{national_id}'.encode()).hexdigest()

        victim, created = VictimProfile.objects.get_or_create(
            phone_number=phone,
            defaults={'full_name': full_name, 'fayda_id_hash': id_hash, 'is_verified': True,
                      'verification_timestamp': timezone.now()},
        )
        if not created:
            changed = []
            if not victim.is_verified:
                victim.is_verified = True
                victim.verification_timestamp = timezone.now()
                changed += ['is_verified', 'verification_timestamp']
            if id_hash and not victim.fayda_id_hash:
                victim.fayda_id_hash = id_hash
                changed.append('fayda_id_hash')
            if changed:
                victim.save(update_fields=changed)

        data['description'] = CitizenIncidentSubmissionSerializer.build_description(data.get('description'), extras)
        report = IncidentReport.objects.create(victim=victim, consent_recorded_at=timezone.now(), **data)

        send_submission_confirmation.delay(str(report.id))
        run_linkage_analysis.delay(str(report.id))

        missing = [label for key, label in self.OPTIONAL_LABELS.items() if key not in provided]
        message = 'Your report has been received. Save your tracking code to check status.'
        if missing:
            message += ' Optional details you skipped (you can still add them later): ' + ', '.join(missing) + '.'
        return Response(
            {
                'tracking_code': report.tracking_code,
                'status': report.status,
                'message': message,
                'optional_fields_missing': [k for k in self.OPTIONAL_LABELS if k not in provided],
            },
            status=status.HTTP_201_CREATED,
        )


class EvidenceUploadView(generics.CreateAPIView):
    """Attaches evidence files to an existing incident report (looked up by
    tracking code) and queues OCR."""
    serializer_class = EvidenceUploadSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
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
    authentication_classes = []
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
