import logging
import secrets
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.db import models
from django.utils import timezone
from django_otp.plugins.otp_totp.models import TOTPDevice
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import User, RefreshTokenDeviceBinding, UserRole, PasswordResetToken
from .permissions import IsSystemAdmin
from .serializers import (
    NDSIRTokenObtainPairSerializer,
    CitizenRegistrationSerializer,
    StaffProvisioningSerializer,
    UserProfileSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
)

logger = logging.getLogger('ndsir')


def _client_ip(request):
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    return forwarded.split(',')[0].strip() if forwarded else request.META.get('REMOTE_ADDR')


class NDSIRTokenObtainPairView(TokenObtainPairView):
    """
    Login endpoint. Rate-limited via ScopedRateThrottle ('auth_login')
    to mitigate credential stuffing against citizen and staff accounts.
    """
    serializer_class = NDSIRTokenObtainPairSerializer
    throttle_scope = 'auth_login'

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            try:
                user = User.objects.get(username=request.data.get('username'))
                # Note: failed_login_attempts/locked_until reset already
                # happens inside NDSIRTokenObtainPairSerializer.validate()
                # on success, since that's also where lockout is enforced -
                # keeping both halves of that logic in one place avoids
                # them drifting out of sync.

                # Store only the token's `jti` claim, never the raw refresh
                # token itself - if this table were ever exfiltrated, a raw
                # token would let an attacker authenticate as the user
                # directly, whereas a jti is useless without the signed
                # token it merely identifies.
                jti = RefreshToken(response.data.get('refresh'))['jti']
                RefreshTokenDeviceBinding.objects.create(
                    user=user,
                    jti=jti,
                    ip_address=_client_ip(request) or '0.0.0.0',
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                )
                logger.info("Successful login: user=%s role=%s ip=%s", user.username, user.role, _client_ip(request))
            except User.DoesNotExist:
                pass
        return response


class CitizenRegisterView(generics.CreateAPIView):
    """Public self-service registration - Citizen role only."""
    queryset = User.objects.all()
    serializer_class = CitizenRegistrationSerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'citizen_intake'


class StaffProvisioningView(generics.CreateAPIView):
    """
    Admin-only provisioning for INSA staff, Bank Agents, and Police
    Liaisons. Never exposed to unauthenticated or citizen traffic.
    """
    queryset = User.objects.all()
    serializer_class = StaffProvisioningSerializer
    permission_classes = [permissions.IsAuthenticated, IsSystemAdmin]
    throttle_scope = 'admin_action'

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        # Respond with the same shape UserListView uses (id, mfa/suspend
        # flags included) so the admin console can drop the new row
        # straight into its table without a second round-trip.
        return Response(UserProfileSerializer(user).data, status=status.HTTP_201_CREATED)


class UserListView(generics.ListAPIView):
    """
    Admin-only directory of every provisioned account (staff and
    external partners; citizens are excluded - there can be hundreds
    of thousands of them and they aren't 'managed' the same way).
    Backs the User Management console screen.
    """
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsSystemAdmin]

    def get_queryset(self):
        return User.objects.exclude(role=UserRole.CITIZEN).order_by('-created_at')


class UserSuspendView(APIView):
    """Admin-only toggle to suspend/reactivate a staff or partner account."""
    permission_classes = [permissions.IsAuthenticated, IsSystemAdmin]

    def post(self, request, user_id):
        try:
            target = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        if target.role == UserRole.CITIZEN:
            return Response({'detail': 'Citizen accounts are not managed here.'}, status=status.HTTP_400_BAD_REQUEST)

        target.is_suspended = not target.is_suspended
        target.save(update_fields=['is_suspended'])
        return Response(UserProfileSerializer(target).data)


class MyProfileView(generics.RetrieveAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class MFAEnrollView(APIView):
    """
    Issues a TOTP device for the authenticated staff/admin user and
    returns a provisioning URI for QR code generation on the frontend.
    MFA is mandatory for all internal INSA roles before privileged
    actions (freezes, SIM suspension, legal export) can be executed.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        device, created = TOTPDevice.objects.get_or_create(
            user=user, name='default', defaults={'confirmed': False}
        )
        return Response({
            'provisioning_uri': device.config_url,
            'created': created,
        }, status=status.HTTP_200_OK)


class MFAConfirmView(APIView):
    """Confirms a TOTP device using the first valid 6-digit code."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        token = request.data.get('token')
        try:
            device = TOTPDevice.objects.get(user=request.user, name='default')
        except TOTPDevice.DoesNotExist:
            return Response({'detail': 'No MFA device enrolled.'}, status=status.HTTP_404_NOT_FOUND)

        if device.verify_token(token):
            device.confirmed = True
            device.save(update_fields=['confirmed'])
            request.user.is_mfa_enabled = True
            request.user.mfa_enforced_at = timezone.now()
            request.user.save(update_fields=['is_mfa_enabled', 'mfa_enforced_at'])
            return Response({'detail': 'MFA enabled successfully.'})
        return Response({'detail': 'Invalid MFA token.'}, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetRequestView(APIView):
    """
    Staff/partner self-service password reset - step 1 of 2. Always
    returns the same generic success response whether or not the
    identifier matches a real account, so this endpoint can't be used
    to enumerate valid usernames/emails. Citizens don't use this: their
    flow (report/track) never requires a password.
    """
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'auth_login'  # same bucket as login - this is exactly the kind of endpoint credential-stuffing tools probe

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        identifier = serializer.validated_data['identifier']

        user = User.objects.filter(
            models.Q(username=identifier) | models.Q(email=identifier)
        ).exclude(role=UserRole.CITIZEN).first()

        if user and user.email:
            token = secrets.token_urlsafe(32)
            PasswordResetToken.objects.create(
                user=user,
                token=token,
                expires_at=timezone.now() + timedelta(minutes=30),
                requested_ip=_client_ip(request),
            )
            reset_url = f"{settings.FRONTEND_BASE_URL}/reset-password?token={token}"
            try:
                send_mail(
                    subject='NDSIR Password Reset Request',
                    message=(
                        f"A password reset was requested for your NDSIR account.\n\n"
                        f"Reset your password: {reset_url}\n\n"
                        f"This link expires in 30 minutes. If you did not request this, "
                        f"you can safely ignore this email - your password has not been changed."
                    ),
                    from_email=None,
                    recipient_list=[user.email],
                    fail_silently=True,
                )
                logger.info("Password reset requested for user=%s", user.username)
            except Exception as exc:  # noqa: BLE001
                logger.warning("Password reset email failed for user=%s: %s", user.username, exc)

        return Response({
            'detail': 'If an account matches that username or email, a password reset link has been sent.'
        })


class PasswordResetConfirmView(APIView):
    """Staff/partner self-service password reset - step 2 of 2."""
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'auth_login'

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            reset_token = PasswordResetToken.objects.select_related('user').get(
                token=serializer.validated_data['token']
            )
        except PasswordResetToken.DoesNotExist:
            return Response({'detail': 'Invalid or expired reset link.'}, status=status.HTTP_400_BAD_REQUEST)

        if not reset_token.is_valid():
            return Response({'detail': 'This reset link has expired or was already used.'},
                             status=status.HTTP_400_BAD_REQUEST)

        user = reset_token.user
        user.set_password(serializer.validated_data['new_password'])
        # A password reset is also a reasonable moment to clear any
        # accumulated lockout state - the person has just proven control
        # of their registered email, which is a stronger signal than the
        # failed attempts that preceded it.
        user.failed_login_attempts = 0
        user.locked_until = None
        user.last_password_change = timezone.now()
        user.save(update_fields=['password', 'failed_login_attempts', 'locked_until', 'last_password_change'])

        reset_token.used_at = timezone.now()
        reset_token.save(update_fields=['used_at'])

        logger.info("Password reset completed for user=%s", user.username)
        return Response({'detail': 'Password updated successfully. You can now sign in.'})
