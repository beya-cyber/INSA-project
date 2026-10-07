from django.contrib import admin
from .models import AssetFreezeOrder, TelecomEscalationOrder


@admin.register(AssetFreezeOrder)
class AssetFreezeOrderAdmin(admin.ModelAdmin):
    list_display = ('account_number', 'destination_bank_code', 'status', 'proposed_by', 'approved_by', 'created_at')
    list_filter = ('status', 'destination_bank_code')
    search_fields = ('account_number', 'ethswitch_order_reference')


@admin.register(TelecomEscalationOrder)
class TelecomEscalationOrderAdmin(admin.ModelAdmin):
    list_display = ('target_value', 'carrier', 'action_type', 'status', 'proposed_by', 'approved_by', 'created_at')
    list_filter = ('status', 'carrier', 'action_type')
    search_fields = ('target_value', 'carrier_reference')
