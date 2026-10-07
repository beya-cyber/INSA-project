from django.conf import settings
from django.db import models


class ActionAuditLog(models.Model):
    """
    Immutable audit ledger. Every privileged action taken by analysts,
    supervisors, bank agents, or admins is permanently logged here.
    Records are never updated or deleted (enforced at the application
    layer - see services.log_action and admin.py's disabled delete/edit).
    """
    action_id = models.AutoField(primary_key=True)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='audit_actions')
    action_type = models.CharField(max_length=50, db_index=True)
    target_report_id = models.UUIDField(null=True, blank=True, db_index=True)
    target_entity = models.CharField(max_length=255, blank=True, null=True)
    status_code = models.CharField(max_length=20, default='SUCCESS')
    ip_address = models.GenericIPAddressField()
    payload_snapshot = models.JSONField()
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'audit_action_log'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['action_type', 'timestamp']),
        ]

    def __str__(self):
        return f"[{self.timestamp}] {self.actor} -> {self.action_type}"

    def save(self, *args, **kwargs):
        if self.pk is not None:
            raise ValueError("ActionAuditLog records are immutable and cannot be modified after creation.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError("ActionAuditLog records cannot be deleted - immutable compliance ledger.")


class RequestAuditEntry(models.Model):
    """
    Lightweight request-level audit trail captured by RequestAuditMiddleware
    for every authenticated API call, independent of business-action logging.
    Useful for security review and anomaly detection (e.g. unusual access
    patterns from a compromised staff credential).
    """
    id = models.BigAutoField(primary_key=True)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    method = models.CharField(max_length=10)
    path = models.CharField(max_length=500)
    status_code = models.PositiveIntegerField()
    ip_address = models.GenericIPAddressField()
    response_time_ms = models.PositiveIntegerField()
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'audit_request_log'
        ordering = ['-timestamp']


class LegalExportPackage(models.Model):
    """
    Court-ready, tamper-evident forensic case package
    (Module 5: Legal Warrant Generation).
    """
    id = models.AutoField(primary_key=True)
    report = models.ForeignKey('incidents.IncidentReport', on_delete=models.PROTECT, related_name='legal_exports')
    generated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                      null=True, related_name='drafted_exports')
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                     null=True, blank=True, related_name='approved_exports')
    investigative_notes = models.TextField(blank=True)
    pdf_file = models.FileField(upload_to='legal_exports/%Y/%m/', null=True, blank=True)
    package_hash_sha256 = models.CharField(max_length=64, blank=True, null=True,
                                            help_text="Chain-of-custody integrity hash of the generated PDF.")
    is_approved = models.BooleanField(default=False)
    downloaded_by_police = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True,
                                                    related_name='downloaded_exports')
    created_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'audit_legal_export_package'
        ordering = ['-created_at']
