from django.urls import path
from . import views, webhooks

app_name = 'incidents'

urlpatterns = [
    # Citizen-facing
    path('submit/', views.CitizenIncidentSubmissionView.as_view(), name='submit'),
    path('evidence/upload/', views.EvidenceUploadView.as_view(), name='evidence-upload'),
    path('track/<str:tracking_code>/', views.CaseTrackingLookupView.as_view(), name='track'),

    # Webhooks (Telegram Bot / IVR)
    path('webhooks/telegram/', webhooks.telegram_webhook, name='telegram-webhook'),
    path('webhooks/ivr/', webhooks.ivr_intake_webhook, name='ivr-webhook'),

    # INSA Triage Console
    path('reports/', views.IncidentReportListView.as_view(), name='report-list'),
    path('reports/<uuid:id>/', views.IncidentReportDetailView.as_view(), name='report-detail'),
]
