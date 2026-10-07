from django.contrib import admin
from .models import VictimProfile, IncidentReport, EvidenceFile


@admin.register(VictimProfile)
class VictimProfileAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'phone_number', 'is_verified', 'created_at')
    search_fields = ('full_name', 'phone_number')
    list_filter = ('is_verified',)


@admin.register(IncidentReport)
class IncidentReportAdmin(admin.ModelAdmin):
    list_display = ('tracking_code', 'victim', 'incident_type', 'channel', 'status', 'risk_score', 'created_at')
    list_filter = ('status', 'incident_type', 'channel')
    search_fields = ('tracking_code', 'scammer_phone_number', 'scammer_identifier')
    readonly_fields = ('tracking_code', 'risk_score')


@admin.register(EvidenceFile)
class EvidenceFileAdmin(admin.ModelAdmin):
    list_display = ('original_filename', 'report', 'file_type', 'authenticity_flag', 'created_at')
    list_filter = ('file_type', 'authenticity_flag')
