from rest_framework import serializers
from apps.incidents.lookups import resolve_report_or_raise
from .models import ActionAuditLog, LegalExportPackage


class ActionAuditLogSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source='actor.username', read_only=True)

    class Meta:
        model = ActionAuditLog
        fields = [
            'action_id', 'actor', 'actor_username', 'action_type', 'target_report_id',
            'target_entity', 'status_code', 'ip_address', 'payload_snapshot', 'timestamp',
        ]
        read_only_fields = fields


class LegalExportPackageDraftSerializer(serializers.ModelSerializer):
    """Accepts the case's tracking code - see AssetFreezeOrderProposeSerializer
    for why this is preferred over exposing the report's raw UUID."""
    report_tracking_code = serializers.CharField(write_only=True)

    class Meta:
        model = LegalExportPackage
        fields = ['id', 'report_tracking_code', 'investigative_notes']

    def create(self, validated_data):
        tracking_code = validated_data.pop('report_tracking_code')
        validated_data['report'] = resolve_report_or_raise(tracking_code)
        return super().create(validated_data)


class LegalExportPackageSerializer(serializers.ModelSerializer):
    report_tracking_code = serializers.CharField(source='report.tracking_code', read_only=True)

    class Meta:
        model = LegalExportPackage
        fields = [
            'id', 'report', 'report_tracking_code', 'generated_by', 'approved_by', 'investigative_notes',
            'pdf_file', 'package_hash_sha256', 'is_approved', 'created_at', 'approved_at',
        ]
        read_only_fields = [
            'id', 'report', 'report_tracking_code', 'generated_by', 'approved_by', 'pdf_file',
            'package_hash_sha256', 'is_approved', 'created_at', 'approved_at',
        ]
