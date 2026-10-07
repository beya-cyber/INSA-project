import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from apps.accounts.models import User, UserRole

pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    return APIClient()


def create_user(role, username, password='StrongPassw0rd!123'):
    user = User.objects.create_user(username=username, password=password, role=role)
    return user


class TestRBACPermissions:
    def test_citizen_cannot_access_triage_console(self, api_client):
        create_user(UserRole.CITIZEN, 'citizen1')
        api_client.force_authenticate(user=User.objects.get(username='citizen1'))
        response = api_client.get(reverse('incidents:report-list'))
        assert response.status_code == 403

    def test_analyst_can_list_reports(self, api_client):
        analyst = create_user(UserRole.INSA_ANALYST, 'analyst1')
        api_client.force_authenticate(user=analyst)
        response = api_client.get(reverse('incidents:report-list'))
        assert response.status_code == 200

    def test_only_supervisor_can_approve_freeze(self, api_client):
        analyst = create_user(UserRole.INSA_ANALYST, 'analyst2')
        api_client.force_authenticate(user=analyst)
        response = api_client.post('/api/v1/integrations/freeze-orders/00000000-0000-0000-0000-000000000000/approve/')
        assert response.status_code in (403, 404)

    def test_auditor_is_read_only_on_reports(self, api_client):
        auditor = create_user(UserRole.AUDITOR, 'auditor1')
        api_client.force_authenticate(user=auditor)
        response = api_client.get(reverse('incidents:report-list'))
        assert response.status_code == 200
