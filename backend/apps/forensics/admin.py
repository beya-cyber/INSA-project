from django.contrib import admin
from .models import ScamLinkageEdge, TransactionLedgerEntry


@admin.register(ScamLinkageEdge)
class ScamLinkageEdgeAdmin(admin.ModelAdmin):
    list_display = ('source_report', 'target_report', 'edge_type', 'shared_value', 'created_at')
    list_filter = ('edge_type',)


@admin.register(TransactionLedgerEntry)
class TransactionLedgerEntryAdmin(admin.ModelAdmin):
    list_display = ('report', 'source_bank', 'destination_bank', 'destination_account', 'amount', 'hop_level', 'is_flagged_endpoint')
    list_filter = ('hop_level', 'is_flagged_endpoint')
    search_fields = ('destination_account',)
