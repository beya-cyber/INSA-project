import uuid
import random
import string
from datetime import datetime
from django.db import models
from django.conf import settings


def generate_tracking_code():
    """Human-readable tracking code citizens use to check case status,
    e.g. NDSIR-2026-7F3K9Q."""
    year = datetime.now().year
    suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"NDSIR-{year}-{suffix}"


class VictimProfile(models.Model):
    """
    Represents a citizen victim. Stores only a hash of their Fayda
    National Digital ID (never the raw ID number) once eKYC validation
    succeeds, per data-minimization / zero-trust policy.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    linked_user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='victim_profile'
    )
    fayda_id_hash = models.CharField(max_length=256, blank=True, null=True, db_index=True)
    full_name = models.CharField(max_length=200)
    phone_number = models.CharField(max_length=20, db_index=True)
    is_verified = models.BooleanField(default=False)
    verification_timestamp = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'incidents_victim_profile'

    def __str__(self):
        return f"{self.full_name} ({'verified' if self.is_verified else 'unverified'})"


class IncidentChannel(models.TextChoices):
    WEB = 'WEB', 'Web Portal'
    TELEGRAM = 'TELEGRAM', 'Telegram Bot'
    IVR = 'IVR', 'IVR Phone System'


class IncidentType(models.TextChoices):
    VOICE_SCAM = 'VOICE_SCAM', 'Voice Scam'
    PHISHING = 'PHISHING', 'Phishing Link'
    MOBILE_BANKING_FRAUD = 'MOBILE_BANKING_FRAUD', 'Mobile Banking Fraud'
    SMS_IMPERSONATION = 'SMS_IMPERSONATION', 'SMS Impersonation'
    SIM_SWAP = 'SIM_SWAP', 'SIM Swap Fraud'
    OTHER = 'OTHER', 'Other'


class IncidentStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    IN_REVIEW = 'IN_REVIEW', 'In Review'
    FROZEN = 'FROZEN', 'Frozen'
    ESCALATED = 'ESCALATED', 'Escalated'
    CLOSED = 'CLOSED', 'Closed'
    REJECTED = 'REJECTED', 'Rejected'


class IncidentReport(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tracking_code = models.CharField(max_length=20, unique=True, default=generate_tracking_code, db_index=True)
    victim = models.ForeignKey(VictimProfile, on_delete=models.PROTECT, related_name='incident_reports')
    channel = models.CharField(max_length=20, choices=IncidentChannel.choices)
    incident_type = models.CharField(max_length=30, choices=IncidentType.choices)
    description = models.TextField(blank=True)

    scammer_phone_number = models.CharField(max_length=20, blank=True, null=True, db_index=True)
    scammer_identifier = models.CharField(max_length=200, blank=True, null=True,
                                           help_text="Bank account, wallet, phishing domain, etc.")

    risk_score = models.PositiveIntegerField(default=0, db_index=True)
    status = models.CharField(max_length=20, choices=IncidentStatus.choices, default=IncidentStatus.PENDING, db_index=True)

    # Data-protection consent record. A citizen submitting via the web
    # wizard explicitly opts in before this can be True; Telegram/IVR
    # intake is treated as implied consent for that channel's own terms
    # (surfaced by the bot/IVR script itself, tracked here for audit
    # completeness rather than left as an unrecorded assumption).
    consent_given = models.BooleanField(default=False)
    consent_recorded_at = models.DateTimeField(null=True, blank=True)

    assigned_analyst = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='assigned_reports'
    )

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'incidents_report'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'risk_score']),
            models.Index(fields=['incident_type']),
        ]

    def __str__(self):
        return f"{self.tracking_code} [{self.status}]"


class EvidenceFileType(models.TextChoices):
    IMAGE = 'IMAGE', 'Image / Screenshot'
    AUDIO = 'AUDIO', 'Audio Recording'
    DOCUMENT = 'DOCUMENT', 'Document / Receipt'
    OTHER = 'OTHER', 'Other'


class AuthenticityFlag(models.TextChoices):
    PENDING = 'PENDING', 'Pending Analysis'
    VALID = 'VALID', 'Valid'
    FLAGGED = 'FLAGGED', 'Flagged - Possible Tampering'


class EvidenceFile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    report = models.ForeignKey(IncidentReport, on_delete=models.CASCADE, related_name='evidence_files')
    file = models.FileField(upload_to='evidence/%Y/%m/', null=True, blank=True,
                             help_text="Set for files uploaded through Django's own storage (web/Telegram intake).")
    external_url = models.URLField(max_length=500, blank=True, null=True,
                                    help_text="Set instead of `file` for evidence hosted on an external system "
                                              "(e.g. an IVR platform's own call-recording storage).")
    file_type = models.CharField(max_length=20, choices=EvidenceFileType.choices)
    original_filename = models.CharField(max_length=255)
    file_hash_sha256 = models.CharField(max_length=64, db_index=True,
                                         help_text="Integrity hash for chain-of-custody verification.")

    ocr_parsed_json = models.JSONField(null=True, blank=True)
    authenticity_flag = models.CharField(max_length=20, choices=AuthenticityFlag.choices, default=AuthenticityFlag.PENDING)
    authenticity_notes = models.TextField(blank=True, null=True)

    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'incidents_evidence_file'
        ordering = ['-created_at']

    def __str__(self):
        return f"Evidence({self.original_filename}) for {self.report.tracking_code}"

    @property
    def storage_location(self):
        """Wherever the actual bytes live, regardless of which field holds it."""
        if self.file:
            return self.file.url
        return self.external_url
