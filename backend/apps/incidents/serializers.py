from rest_framework import serializers
from .models import VictimProfile, IncidentReport, EvidenceFile


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


class IncidentReportListSerializer(serializers.ModelSerializer):
    victim_name = serializers.CharField(source='victim.full_name', read_only=True)

    class Meta:
        model = IncidentReport
        fields = [
            'id', 'tracking_code', 'victim_name', 'channel', 'incident_type',
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
    Step-driven public submission serializer matching the frontend's
    4-step wizard supporting flexible identity types (Fayda, Kebele ID, Passport).
    """
    full_name = serializers.CharField(write_only=True)
    phone_number = serializers.CharField(write_only=True)
    id_type = serializers.CharField(write_only=True, default="FAYDA", help_text="Options: FAYDA, KEBELE, PASSPORT")
    verification_token = serializers.CharField(write_only=True,
        help_text="Verification token or document reference.")

    class Meta:
        model = IncidentReport
        fields = [
            'full_name', 'phone_number', 'id_type', 'verification_token', 'consent_given',
            'channel', 'incident_type', 'description',
            'scammer_phone_number', 'scammer_identifier',
        ]

    def validate_verification_token(self, value):
        if not value:
            raise serializers.ValidationError("A valid verification reference or token is required.")
        return value

    def validate_consent_given(self, value):
        if not value:
            raise serializers.ValidationError(
                "You must consent to data processing before a report can be submitted."
            )
        return value


class CaseTrackingStatusSerializer(serializers.ModelSerializer):
    """Minimal public-facing status view, exposed only via tracking code lookup."""
    class Meta:
        model = IncidentReport
        fields = ['tracking_code', 'status', 'incident_type', 'created_at', 'updated_at']
