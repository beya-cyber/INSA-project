"""
Main API router for the National Digital Scam Incident Response System.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from rest_framework_simplejwt.views import TokenRefreshView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


def healthz(request):
    """
    Unauthenticated liveness endpoint for Docker/orchestrator health
    checks and load balancer probes.
    """
    return JsonResponse({'status': 'ok', 'service': 'ndsir-backend'})


urlpatterns = [
    path('healthz/', healthz, name='healthz'),
    path('admin/', admin.site.urls),

    # API Schema / Docs
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),

    # Auth & JWT
    path('api/v1/auth/', include('apps.accounts.urls')),
    path('api/v1/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # User Management Endpoint
    path('api/v1/', include('apps.accounts.urls')),

    # Citizen Intake & Case Management
    path('api/v1/incidents/', include('apps.incidents.urls')),

    # Forensics, OCR, Linkage Graph
    path('api/v1/forensics/', include('apps.forensics.urls')),

    # External Integrations (Bank/EthSwitch, Telecom, Fayda)
    path('api/v1/integrations/', include('apps.integrations.urls')),

    # Audit Logs & Legal Export
    path('api/v1/audit/', include('apps.audit_logs.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)