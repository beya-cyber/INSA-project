import pytest
from datetime import timedelta
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User, UserRole, PasswordResetToken

pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    return APIClient()


def create_staff_user(username='sup_locktest', password='StrongPassw0rd!123', role=UserRole.INSA_SUPERVISOR, email=None):
    return User.objects.create_user(username=username, password=password, role=role, email=email)


class TestAccountLockout:
    def test_successful_login_does_not_lock_account(self, api_client):
        create_staff_user()
        response = api_client.post('/api/v1/auth/login/', {
            'username': 'sup_locktest', 'password': 'StrongPassw0rd!123',
        })
        assert response.status_code == 200

    def test_repeated_failed_logins_lock_the_account(self, api_client, settings):
        settings.ACCOUNT_LOCKOUT_THRESHOLD = 3
        create_staff_user()

        for _ in range(3):
            response = api_client.post('/api/v1/auth/login/', {
                'username': 'sup_locktest', 'password': 'WrongPassword!!',
            })
            assert response.status_code == 401

        user = User.objects.get(username='sup_locktest')
        assert user.failed_login_attempts >= 3
        assert user.locked_until is not None
        assert user.locked_until > timezone.now()

    def test_locked_account_rejects_even_correct_password(self, api_client, settings):
        settings.ACCOUNT_LOCKOUT_THRESHOLD = 2
        create_staff_user()

        for _ in range(2):
            api_client.post('/api/v1/auth/login/', {'username': 'sup_locktest', 'password': 'wrong'})

        # Now try with the CORRECT password - should still be rejected while locked.
        response = api_client.post('/api/v1/auth/login/', {
            'username': 'sup_locktest', 'password': 'StrongPassw0rd!123',
        })
        assert response.status_code == 401
        assert 'locked' in str(response.data).lower()

    def test_successful_login_clears_prior_lockout_state(self, api_client, settings):
        settings.ACCOUNT_LOCKOUT_THRESHOLD = 5
        user = create_staff_user()
        user.failed_login_attempts = 2
        user.save(update_fields=['failed_login_attempts'])

        response = api_client.post('/api/v1/auth/login/', {
            'username': 'sup_locktest', 'password': 'StrongPassw0rd!123',
        })
        assert response.status_code == 200
        user.refresh_from_db()
        assert user.failed_login_attempts == 0
        assert user.locked_until is None

    def test_suspended_account_cannot_log_in_at_all(self, api_client):
        user = create_staff_user()
        user.is_suspended = True
        user.save(update_fields=['is_suspended'])

        response = api_client.post('/api/v1/auth/login/', {
            'username': 'sup_locktest', 'password': 'StrongPassw0rd!123',
        })
        assert response.status_code == 401
        assert 'suspended' in str(response.data).lower()


class TestPasswordReset:
    def test_request_always_returns_generic_success_for_unknown_identifier(self, api_client):
        response = api_client.post('/api/v1/auth/password-reset/request/', {'identifier': 'nobody_here'})
        assert response.status_code == 200

    def test_request_creates_a_token_for_known_staff_user(self, api_client):
        create_staff_user(email='sup@ndsir.local')
        assert PasswordResetToken.objects.count() == 0
        response = api_client.post('/api/v1/auth/password-reset/request/', {'identifier': 'sup_locktest'})
        assert response.status_code == 200
        assert PasswordResetToken.objects.count() == 1

    def test_confirm_with_valid_token_changes_password(self, api_client):
        user = create_staff_user(email='sup@ndsir.local')
        reset_token = PasswordResetToken.objects.create(
            user=user, token='valid-token-123', expires_at=timezone.now() + timedelta(minutes=30),
        )
        response = api_client.post('/api/v1/auth/password-reset/confirm/', {
            'token': 'valid-token-123', 'new_password': 'BrandNewPassword!456',
        })
        assert response.status_code == 200

        user.refresh_from_db()
        assert user.check_password('BrandNewPassword!456')
        reset_token.refresh_from_db()
        assert reset_token.used_at is not None

    def test_confirm_rejects_expired_token(self, api_client):
        user = create_staff_user(email='sup@ndsir.local')
        PasswordResetToken.objects.create(
            user=user, token='expired-token', expires_at=timezone.now() - timedelta(minutes=1),
        )
        response = api_client.post('/api/v1/auth/password-reset/confirm/', {
            'token': 'expired-token', 'new_password': 'BrandNewPassword!456',
        })
        assert response.status_code == 400

    def test_confirm_rejects_already_used_token(self, api_client):
        user = create_staff_user(email='sup@ndsir.local')
        PasswordResetToken.objects.create(
            user=user, token='used-token', expires_at=timezone.now() + timedelta(minutes=30),
            used_at=timezone.now(),
        )
        response = api_client.post('/api/v1/auth/password-reset/confirm/', {
            'token': 'used-token', 'new_password': 'BrandNewPassword!456',
        })
        assert response.status_code == 400

    def test_confirm_rejects_unknown_token(self, api_client):
        response = api_client.post('/api/v1/auth/password-reset/confirm/', {
            'token': 'this-token-does-not-exist', 'new_password': 'BrandNewPassword!456',
        })
        assert response.status_code == 400
