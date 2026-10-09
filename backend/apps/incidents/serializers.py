import re
from decimal import Decimal

from django.core.validators import RegexValidator
from rest_framework import serializers

from . import otp
from .models import VictimProfile, IncidentReport, EvidenceFile, IncidentChannel

# ---- shared validation rules (mirrored in frontend CitizenIntakeWizard.jsx - keep in sync)
ET_PHONE_VALIDATOR = RegexValidator(
    regex=r'^(\+?251|0)?[79]\d{8}$',
    message=otp.ET_MOBILE_MESSAGE,
    code='invalid_phone',
)
ID_PATTERNS = {
    'FAYDA': (re.compile(r'^FIN-\d{4}-\d{4}$'), 'Fayda FIN must look like FIN-1234-5678.'),
    'KEBELE': (re.compile(r'^\d{6,}$'), 'Kebele ID must be at least 6 digits.'),
    'PASSPORT': (re.compile(r'^[A-Z]{2}\d{7}$'), 'Passport number must be 2 capital letters followed by 7 digits (e.g. EP1234567).'),
}
MAX_AMOUNT_ETB = Decimal('10000000')
INTAKE_OPEN, INTAKE_CLOSE = '[NDSIR-INTAKE]', '[/NDSIR-INTAKE]'


class VictimProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = VictimProfile
        fields = ['id', 'full_name', 'phone_number', 'is_verified', 'created_at']
        read_only_fields = ['id', 'is_verified', 'created_at']


class EvidenceFileSerializer(serializers.ModelSerializer):
    # Unified accessor: `file.url` when Django manages the storage, else
    # `external_url` (e.g. an IVR platform's own recording host). The
    # frontend should render from this field rather than choosing
    # between `file`/`external_url` itself.
    display_url = serializers.SerializerMethodField()

    class Meta:
        model = EvidenceFile
        fields = [
            'id', 'report', 'file', 'external_url', 'display_url', 'file_type', 'original_filename',
            'file_hash_sha256', 'ocr_parsed_json', 'authenticity_flag',
            'authenticity_notes', 'created_at',
        ]
        read_only_fields = ['id', 'file_hash_sha256', 'ocr_parsed_json',
                            'authenticity_flag', 'authenticity_notes', 'created_at']

    def get_display_url(self, obj):
        request = self.context.get('request')
        if obj.file:
            return request.build_absolute_uri(obj.file.url) if request else obj.file.url
        return obj.external_url


class EvidenceUploadSerializer(serializers.ModelSerializer):
    """
    Used strictly on the citizen intake path. Accepts the public
    tracking code rather than the report's internal UUID, since that's
    the only identifier a citizen (or the Telegram/IVR bots acting on
    their behalf) ever has - and accepting a raw PK here would let
    anyone who merely knows a UUID attach evidence to someone else's
    case.
    """
    tracking_code = serializers.CharField(write_only=True)

    class Meta:
        model = EvidenceFile
        fields = ['tracking_code', 'file', 'file_type', 'original_filename']

    def validate_tracking_code(self, value):
        from apps.incidents.lookups import resolve_report_or_raise
        self._report = resolve_report_or_raise(value)
        return value

    def create(self, validated_data):
        validated_data.pop('tracking_code')
        validated_data['report'] = self._report
        return super().create(validated_data)


class VictimSummarySerializer(serializers.ModelSerializer):
    """Staff-only view of the victim. `fayda_id_hash` is a salted SHA-256 - never the raw ID number."""
    class Meta:
        model = VictimProfile
        fields = ['id', 'full_name', 'phone_number', 'fayda_id_hash', 'is_verified']
        read_only_fields = fields


class EvidenceSummarySerializer(serializers.ModelSerializer):
    display_url = serializers.SerializerMethodField()

    class Meta:
        model = EvidenceFile
        fields = ['id', 'original_filename', 'file_type', 'file_hash_sha256',
                  'authenticity_flag', 'display_url', 'created_at']
        read_only_fields = fields

    def get_display_url(self, obj):
        request = self.context.get('request')
        if obj.file:
            return request.build_absolute_uri(obj.file.url) if request else obj.file.url
        return obj.external_url


class IncidentReportListSerializer(serializers.ModelSerializer):
    victim_name = serializers.CharField(source='victim.full_name', read_only=True)
    victim = VictimSummarySerializer(read_only=True)
    evidence_files = EvidenceSummarySerializer(many=True, read_only=True)

    class Meta:
        model = IncidentReport
        fields = [
            'id', 'tracking_code', 'victim_name', 'victim', 'channel', 'incident_type',
            'description', 'scammer_phone_number', 'scammer_identifier', 'evidence_files',
            'risk_score', 'status', 'assigned_analyst', 'created_at', 'updated_at',
        ]


class IncidentReportDetailSerializer(serializers.ModelSerializer):
    victim = VictimProfileSerializer(read_only=True)
    evidence_files = EvidenceFileSerializer(many=True, read_only=True)

    class Meta:
        model = IncidentReport
        fields = [
            'id', 'tracking_code', 'victim', 'channel', 'incident_type', 'description',
            'scammer_phone_number', 'scammer_identifier', 'risk_score', 'status',
            'assigned_analyst', 'evidence_files', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'tracking_code', 'risk_score', 'created_at', 'updated_at']


class CitizenIncidentSubmissionSerializer(serializers.ModelSerializer):
    """
    Public wizard submission. Every rule here is also enforced client-side for UX,
    but this is the authority. Failures return HTTP 400 with per-field errors:
    {"success": false, "error": {"code": 400, "detail": {"full_name": ["..."], ...}}}

    REQUIRED : full_name, phone_number, verification_token (from /otp/verify/), consent_given,
               incident_type
    OPTIONAL : national_id (+id_type), description (warned if < 20 chars), amount, transaction_id,
               scammer_phone_number, scammer_identifier, source_bank, source_account, target_platform
    """
    full_name = serializers.CharField(write_only=True, min_length=2, max_length=200)
    phone_number = serializers.CharField(write_only=True, validators=[ET_PHONE_VALIDATOR])
    id_type = serializers.ChoiceField(write_only=True, choices=list(ID_PATTERNS), default='FAYDA', required=False)
    national_id = serializers.CharField(write_only=True, required=False, allow_blank=True, max_length=40)
    verification_token = serializers.CharField(
        write_only=True, help_text='Signed token returned by /incidents/otp/verify/ for this phone number.')

    # Optional structured details. The model has no columns for these yet, so they are
    # validated here and appended to `description` as a machine-readable block (see create()).
    amount = serializers.DecimalField(write_only=True, required=False, max_digits=14, decimal_places=2)
    transaction_id = serializers.CharField(write_only=True, required=False, allow_blank=True, max_length=100)
    source_bank = serializers.CharField(write_only=True, required=False, allow_blank=True, max_length=100)
    source_account = serializers.CharField(write_only=True, required=False, allow_blank=True, max_length=100)
    target_platform = serializers.CharField(write_only=True, required=False, allow_blank=True, max_length=100)

    OPTIONAL_FIELDS = ['national_id', 'description', 'amount', 'transaction_id', 'scammer_phone_number',
                       'scammer_identifier', 'source_bank', 'source_account', 'target_platform']

    class Meta:
        model = IncidentReport
        fields = [
            'full_name', 'phone_number', 'id_type', 'national_id', 'verification_token', 'consent_given',
            'channel', 'incident_type', 'description',
            'scammer_phone_number', 'scammer_identifier',
            'amount', 'transaction_id', 'source_bank', 'source_account', 'target_platform',
        ]
        extra_kwargs = {
            'channel': {'required': False, 'default': IncidentChannel.WEB},
            'description': {'required': False, 'allow_blank': True, 'max_length': 5000},
            'scammer_phone_number': {'required': False, 'allow_blank': True, 'allow_null': True},
            'scammer_identifier': {'required': False, 'allow_blank': True, 'allow_null': True},
        }

    # -- field level
    def validate_full_name(self, value):
        value = ' '.join(value.split())
        parts = value.split(' ')
        if len(parts) < 2:
            raise serializers.ValidationError('Enter your first and last name (at least two words).')
        if any(ch.isdigit() for ch in value) or not re.match(r"^[\w .'\-]+$", value) or '_' in value:
            raise serializers.ValidationError("Name may only contain letters, spaces, apostrophes, periods and hyphens.")
        return value

    def validate_phone_number(self, value):
        return otp.normalize_phone(value)  # validator already proved it parses

    def validate_scammer_phone_number(self, value):
        value = re.sub(r'[\s\-()]', '', value or '')
        if value and not re.match(r'^\+?\d{7,15}$', value):
            raise serializers.ValidationError('Enter the number using digits only (7-15 digits, optional leading +).')
        return value or None

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('Amount must be greater than 0.')
        if value > MAX_AMOUNT_ETB:
            raise serializers.ValidationError('Amount cannot exceed 10,000,000 ETB.')
        return value

    def validate_consent_given(self, value):
        if not value:
            raise serializers.ValidationError(
                'You must accept the legal declaration and consent to data processing before a report can be submitted.')
        return value

    # -- cross field
    def validate(self, attrs):
        id_type = attrs.get('id_type', 'FAYDA').upper()
        national_id = (attrs.get('national_id') or '').strip()
        if national_id:
            pattern, message = ID_PATTERNS[id_type]
            candidate = national_id.upper() if id_type in ('FAYDA', 'PASSPORT') else national_id
            if not pattern.match(candidate):
                raise serializers.ValidationError({'national_id': [message]})
            attrs['national_id'] = candidate
        attrs['id_type'] = id_type

        ok, reason = otp.validate_verification_token(attrs['phone_number'], attrs['verification_token'])
        if not ok:
            messages = {
                'expired': 'Phone verification expired. Please request a new code.',
                'used': 'This phone verification was already used. Please verify again.',
                'invalid': 'Phone verification is invalid. Please verify your phone number again.',
            }
            raise serializers.ValidationError({'verification_token': [messages[reason]]})
        return attrs

    # -- helpers used by the view
    @classmethod
    def build_description(cls, narrative, extras):
        """Narrative first, then a server-built trailer. Any trailer markers inside the narrative are stripped."""
        narrative = (narrative or '').replace(INTAKE_OPEN, '').replace(INTAKE_CLOSE, '').strip()
        lines = []
        if extras.get('amount') is not None:
            lines.append(f"amount_etb={extras['amount']:.2f}")
        for key in ('transaction_id', 'source_bank', 'source_account', 'target_platform'):
            val = (extras.get(key) or '').replace('\n', ' ').strip()
            if val:
                lines.append(f'{key}={val}')
        if not lines:
            return narrative
        return f"{narrative}\n\n{INTAKE_OPEN}\n" + '\n'.join(lines) + f"\n{INTAKE_CLOSE}"


class CaseTrackingStatusSerializer(serializers.ModelSerializer):
    """Minimal public-facing status view, exposed only via tracking code lookup."""
    class Meta:
        model = IncidentReport
        fields = ['tracking_code', 'status', 'incident_type', 'created_at', 'updated_at']
