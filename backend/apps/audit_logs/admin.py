from django.contrib import admin
from .models import ActionAuditLog, RequestAuditEntry, LegalExportPackage


@admin.register(ActionAuditLog)
class ActionAuditLogAdmin(admin.ModelAdmin):
    list_display = ('action_id', 'actor', 'action_type', 'target_report_id', 'status_code', 'ip_address', 'timestamp')
    list_filter = ('action_type', 'status_code')
    search_fields = ('actor__username', 'target_entity')

    def has_delete_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(RequestAuditEntry)
class RequestAuditEntryAdmin(admin.ModelAdmin):
    list_display = ('actor', 'method', 'path', 'status_code', 'response_time_ms', 'timestamp')
    list_filter = ('method', 'status_code')

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(LegalExportPackage)
class LegalExportPackageAdmin(admin.ModelAdmin):
    list_display = ('id', 'report', 'generated_by', 'approved_by', 'is_approved', 'created_at')
    list_filter = ('is_approved',)
