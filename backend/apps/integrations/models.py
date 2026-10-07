import uuid
from django.conf import settings
from django.db import models
from apps.incidents.models import IncidentReport


class FreezeOrderStatus(models.TextChoices):
    PROPOSED = 'PROPOSED', 'Proposed by Analyst'
    APPROVED = 'APPROVED', 'Approved by Supervisor'
    SENT = 'SENT', 'Sent to Bank/EthSwitch'
    ACKNOWLEDGED = 'ACKNOWLEDGED', 'Acknowledged by Bank'
    REJECTED = 'REJECTED', 'Rejected'
    FAILED = 'FAILED', 'Delivery Failed'


class AssetFreezeOrder(models.Model):
    """One-Click Administrative Asset Lock (Module 3)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    report = models.ForeignKey(IncidentReport, on_delete=models.CASCADE, related_name='freeze_orders')
    destination_bank_code = models.CharField(max_length=50)
    account_number = models.CharField(max_length=100)
    reason = models.TextField()

    proposed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                     null=True, related_name='proposed_freezes')
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                     null=True, blank=True, related_name='approved_freezes')

    status = models.CharField(max_length=20, choices=FreezeOrderStatus.choices, default=FreezeOrderStatus.PROPOSED)
    ethswitch_order_reference = models.CharField(max_length=100, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    acknowledged_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'integrations_asset_freeze_order'
        ordering = ['-created_at']

    def __str__(self):
        return f"Freeze({self.account_number}) - {self.status}"


class TelecomActionType(models.TextChoices):
    SIM_SUSPEND = 'SIM_SUSPEND', 'SIM Suspension'
    IMEI_BLACKLIST = 'IMEI_BLACKLIST', 'IMEI Blacklist'


class TelecomEscalationOrder(models.Model):
    """Automated SIM & IMEI Blacklisting (Module 4)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    report = models.ForeignKey(IncidentReport, on_delete=models.CASCADE, related_name='telecom_orders')
    carrier = models.CharField(max_length=30, help_text="ETHIO_TELECOM or SAFARICOM_ET")
    action_type = models.CharField(max_length=20, choices=TelecomActionType.choices)
    target_value = models.CharField(max_length=50, help_text="Phone number or IMEI")
    reason = models.TextField()

    proposed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                     null=True, related_name='proposed_telecom_orders')
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                     null=True, blank=True, related_name='approved_telecom_orders')

    status = models.CharField(max_length=20, choices=FreezeOrderStatus.choices, default=FreezeOrderStatus.PROPOSED)
    carrier_reference = models.CharField(max_length=100, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'integrations_telecom_escalation_order'
        ordering = ['-created_at']
