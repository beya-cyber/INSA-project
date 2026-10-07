from rest_framework import serializers
from .models import ScamLinkageEdge, TransactionLedgerEntry


class TransactionLedgerEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = TransactionLedgerEntry
        fields = [
            'id', 'report', 'source_bank', 'destination_bank', 'destination_account',
            'amount', 'hop_level', 'is_flagged_endpoint', 'timestamp',
        ]


class ScamLinkageEdgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScamLinkageEdge
        fields = ['id', 'source_report', 'target_report', 'edge_type', 'shared_value', 'created_at']


class LinkageGraphResponseSerializer(serializers.Serializer):
    nodes = serializers.ListField()
    links = serializers.ListField()
