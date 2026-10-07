import uuid
from django.db import models
from apps.incidents.models import IncidentReport


class LinkageEdgeType(models.TextChoices):
    SHARED_SCAMMER_PHONE = 'SHARED_SCAMMER_PHONE', 'Shared Scammer Phone'
    SHARED_DESTINATION_ACCOUNT = 'SHARED_DESTINATION_ACCOUNT', 'Shared Destination Account'
    TRANSACTION_HOP = 'TRANSACTION_HOP', 'Transaction Hop'


class ScamLinkageEdge(models.Model):
    """
    Graph edge connecting two incident reports (or an incident report and
    a destination account/phone node) used to render the Scam Linkage
    Visualizer (Frontend Phase 2.4) and drive automated risk escalation.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    source_report = models.ForeignKey(IncidentReport, on_delete=models.CASCADE, related_name='outgoing_links')
    target_report = models.ForeignKey(IncidentReport, on_delete=models.CASCADE, related_name='incoming_links')
    edge_type = models.CharField(max_length=40, choices=LinkageEdgeType.choices)
    shared_value = models.CharField(max_length=255, help_text="The phone number or account matched between reports.")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'forensics_scam_linkage_edge'
        unique_together = ('source_report', 'target_report', 'edge_type', 'shared_value')


class TransactionLedgerEntry(models.Model):
    """
    Multi-hop fund traversal record - tracks stolen funds across
    multiple receiving wallets/accounts (Module 3).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    report = models.ForeignKey(IncidentReport, on_delete=models.CASCADE, related_name='transaction_hops')
    source_bank = models.CharField(max_length=100)
    destination_bank = models.CharField(max_length=100)
    destination_account = models.CharField(max_length=100, db_index=True)
    amount = models.DecimalField(max_digits=16, decimal_places=2)
    hop_level = models.PositiveIntegerField(default=0, help_text="0 = original transfer, 1+ = downstream hops.")
    is_flagged_endpoint = models.BooleanField(default=False)
    timestamp = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'forensics_transaction_ledger'
        ordering = ['hop_level', 'timestamp']
        indexes = [
            models.Index(fields=['destination_account']),
            models.Index(fields=['hop_level']),
        ]

    def __str__(self):
        return f"Hop {self.hop_level}: {self.source_bank} -> {self.destination_bank} ({self.amount})"
