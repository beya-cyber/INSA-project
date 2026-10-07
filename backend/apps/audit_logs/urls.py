from django.urls import path
from . import views

app_name = 'audit_logs'

urlpatterns = [
    path('logs/', views.ActionAuditLogListView.as_view(), name='audit-log-list'),

    path('legal-export/draft/', views.LegalExportPackageDraftView.as_view(), name='legal-export-draft'),
    path('legal-export/<int:package_id>/approve/', views.LegalExportPackageApproveAndGenerateView.as_view(), name='legal-export-approve'),
    path('legal-export/<int:package_id>/download/', views.LegalExportPackageDownloadView.as_view(), name='legal-export-download'),
]
