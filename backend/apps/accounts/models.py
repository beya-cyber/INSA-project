import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class UserRole(models.TextChoices):
    CITIZEN = 'CITIZEN', 'Citizen / Victim'
    INSA_ANALYST = 'INSA_ANALYST', 'INSA Forensic Analyst'
    INSA_SUPERVISOR = 'INSA_SUPERVISOR', 'INSA Operations Supervisor'
    AUDITOR = 'AUDITOR', 'System & Compliance Auditor'
    ADMIN = 'ADMIN', 'System Administrator'
    BANK_AGENT = 'BANK_AGENT', 'Bank / Financial Institution Agent'
    POLICE_LIAISON = 'POLICE_LIAISON', 'Federal Police CIB Liaison'


class User(AbstractUser):
    """
    Custom user model for NDSIR. Extends Django's AbstractUser with
    role-based access fields, MFA state, Fayda eKYC linkage, and
    external partner organization metadata.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(max_length=30, choices=UserRole.choices, default=UserRole.CITIZEN)

    # Fayda National Digital ID linkage - store only a salted hash, never raw ID
    fayda_id_hash = models.CharField(max_length=256, blank=True, null=True, db_index=True)
    is_identity_verified = models.BooleanField(default=False)

    # External partner metadata (Bank Agents / Police Liaisons)
    organization_name = models.CharField(max_length=150, blank=True, null=True)
    organization_code = models.CharField(max_length=50, blank=True, null=True,
                                          help_text="e.g. CBE, TELEBIRR, AWASH, ETHSWITCH, FEDPOL-CIB")

    phone_number = models.CharField(max_length=20, blank=True, null=True)

    # MFA (TOTP via django-otp)
    is_mfa_enabled = models.BooleanField(default=False)
    mfa_enforced_at = models.DateTimeField(null=True, blank=True)

    # Account lifecycle / zero-trust controls
    is_suspended = models.BooleanField(default=False)
    last_password_change = models.DateTimeField(null=True, blank=True)
    failed_login_attempts = models.PositiveIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'accounts_user'
        indexes = [
            models.Index(fields=['role']),
            models.Index(fields=['organization_code']),
        ]

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

    # -- Role helper predicates -------------------------------------------------
    def is_insa_staff(self):
        return self.role in [UserRole.INSA_ANALYST, UserRole.INSA_SUPERVISOR, UserRole.ADMIN]

    def is_investigator(self):
        return self.role in [UserRole.INSA_ANALYST, UserRole.INSA_SUPERVISOR]

    def is_external_partner(self):
        return self.role in [UserRole.BANK_AGENT, UserRole.POLICE_LIAISON]

    def can_approve_freeze(self):
        return self.role == UserRole.INSA_SUPERVISOR

    def can_view_all_cases(self):
        return self.role in [
            UserRole.INSA_ANALYST, UserRole.INSA_SUPERVISOR, UserRole.AUDITOR
        ]


class RefreshTokenDeviceBinding(models.Model):
    """
    Binds issued refresh tokens to a device fingerprint / IP for
    zero-trust session integrity checks and forced revocation support.
    """
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='device_bindings')
    jti = models.CharField(max_length=255, unique=True)
    device_fingerprint = models.CharField(max_length=255, blank=True, null=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True, null=True)
    issued_at = models.DateTimeField(auto_now_add=True)
    revoked = models.BooleanField(default=False)
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'accounts_refresh_token_binding'


class PasswordResetToken(models.Model):
    """
    Self-service password reset for staff and external-partner accounts
    (citizens don't use this - they don't need a password at all for
    the report/track flow). Deliberately a real, stateful model rather
    than relying purely on Django's stateless PasswordResetTokenGenerator,
    so a token can be marked used and can't be replayed even within its
    validity window.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_tokens')
    token = models.CharField(max_length=64, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    requested_ip = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        db_table = 'accounts_password_reset_token'

    def is_valid(self):
        return self.used_at is None and self.expires_at > timezone.now()
