from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import IncidentViewSet, WarrantViewSet, AuditLogViewSet

# Automates URL routing for all our API endpoints
router = DefaultRouter()
router.register(r'incidents', IncidentViewSet)
router.register(r'warrants', WarrantViewSet)
router.register(r'audit-logs', AuditLogViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
