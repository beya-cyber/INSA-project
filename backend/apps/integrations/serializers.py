from rest_framework import serializers
from apps.incidents.lookups import resolve_report_or_raise
from .models import AssetFreezeOrder, TelecomEscalationOrder


class AssetFreezeOrderProposeSerializer(serializers.ModelSerializer):
    """
    Accepts the case's public tracking code rather than its internal
    UUID - an analyst working a case only ever sees and types the
    tracking code (it's printed on every screen), never the database
    primary key.
    """
    report_tracking_code = serializers.CharField(write_only=True)

    class Meta:
        model = AssetFreezeOrder
        fields = ['id', 'report_tracking_code', 'destination_bank_code', 'account_number', 'reason', 'status', 'created_at']
        read_only_fields = ['id', 'status', 'created_at']

    def create(self, validated_data):
        tracking_code = validated_data.pop('report_tracking_code')
        validated_data['report'] = resolve_report_or_raise(tracking_code)
        return super().create(validated_data)


class AssetFreezeOrderSerializer(serializers.ModelSerializer):
    report_tracking_code = serializers.CharField(source='report.tracking_code', read_only=True)

    class Meta:
        model = AssetFreezeOrder
        fields = [
            'id', 'report', 'report_tracking_code', 'destination_bank_code', 'account_number', 'reason',
            'proposed_by', 'approved_by', 'status', 'ethswitch_order_reference',
            'created_at', 'approved_at', 'acknowledged_at',
        ]
        read_only_fields = [
            'id', 'report', 'report_tracking_code', 'proposed_by', 'approved_by', 'ethswitch_order_reference',
            'created_at', 'approved_at', 'acknowledged_at',
        ]


class TelecomEscalationOrderProposeSerializer(serializers.ModelSerializer):
    report_tracking_code = serializers.CharField(write_only=True)

    class Meta:
        model = TelecomEscalationOrder
        fields = ['id', 'report_tracking_code', 'carrier', 'action_type', 'target_value', 'reason', 'status', 'created_at']
        read_only_fields = ['id', 'status', 'created_at']

    def create(self, validated_data):
        tracking_code = validated_data.pop('report_tracking_code')
        validated_data['report'] = resolve_report_or_raise(tracking_code)
        return super().create(validated_data)


class TelecomEscalationOrderSerializer(serializers.ModelSerializer):
    report_tracking_code = serializers.CharField(source='report.tracking_code', read_only=True)

    class Meta:
        model = TelecomEscalationOrder
        fields = [
            'id', 'report', 'report_tracking_code', 'carrier', 'action_type', 'target_value', 'reason',
            'proposed_by', 'approved_by', 'status', 'carrier_reference',
            'created_at', 'approved_at',
        ]
        read_only_fields = [
            'id', 'report', 'report_tracking_code', 'proposed_by', 'approved_by',
            'carrier_reference', 'created_at', 'approved_at',
        ]
