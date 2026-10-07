from django.contrib.auth import password_validation
from django.conf import settings as django_settings
from django.utils import timezone
from datetime import timedelta
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.exceptions import AuthenticationFailed

from .models import User, UserRole


class NDSIRTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Extends the default JWT serializer to:
      1. Embed role and identity verification claims directly in the
         access token, so the React frontend can route users without an
         extra profile round-trip.
      2. Enforce account-level lockout after repeated failed attempts -
         the User model already had `failed_login_attempts` and
         `locked_until` fields, but nothing previously wrote to them.
         IP-based throttling (ScopedRateThrottle, see settings) alone
         is not sufficient protection: it can be defeated by rotating
         source IPs, and it also doesn't distinguish "many different
         people mistyping their own passwords" from "one attacker
         hammering a single account" - this closes that specific gap.
    """
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['is_identity_verified'] = user.is_identity_verified
        token['is_mfa_enabled'] = user.is_mfa_enabled
        token['organization_code'] = user.organization_code
        return token

    def validate(self, attrs):
        username = attrs.get(self.username_field)
        existing_user = User.objects.filter(username=username).first()

        if existing_user and existing_user.locked_until and existing_user.locked_until > timezone.now():
            minutes_left = max(1, int((existing_user.locked_until - timezone.now()).total_seconds() // 60) + 1)
            raise AuthenticationFailed(
                f"This account is temporarily locked after repeated failed sign-in attempts. "
                f"Try again in about {minutes_left} minute(s), or contact your System Administrator."
            )

        if existing_user and existing_user.is_suspended:
            # Suspension previously only affected RBAC checks on specific
            # endpoints (IsINSAAnalyst, IsBankAgent, etc. all check
            # is_suspended) - meaning a suspended account could still
            # successfully authenticate and hold a valid token for any
            # endpoint that doesn't use one of those role-scoped
            # permission classes (e.g. /auth/me/). Blocking it here
            # closes that gap at the source: no token is issued at all.
            raise AuthenticationFailed(
                "This account has been suspended. Contact your System Administrator."
            )

        try:
            data = super().validate(attrs)
        except AuthenticationFailed:
            if existing_user:
                self._register_failed_attempt(existing_user)
            raise

        # Successful login: clear any accumulated failure count/lock.
        if existing_user and (existing_user.failed_login_attempts or existing_user.locked_until):
            existing_user.failed_login_attempts = 0
            existing_user.locked_until = None
            existing_user.save(update_fields=['failed_login_attempts', 'locked_until'])

        data['role'] = self.user.role
        data['username'] = self.user.username
        data['is_mfa_enabled'] = self.user.is_mfa_enabled
        return data

    def _register_failed_attempt(self, user):
        threshold = getattr(django_settings, 'ACCOUNT_LOCKOUT_THRESHOLD', 5)
        lockout_minutes = getattr(django_settings, 'ACCOUNT_LOCKOUT_MINUTES', 15)

        user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
        if user.failed_login_attempts >= threshold:
            user.locked_until = timezone.now() + timedelta(minutes=lockout_minutes)
        user.save(update_fields=['failed_login_attempts', 'locked_until'])


class CitizenRegistrationSerializer(serializers.ModelSerializer):
    """
    Public self-registration for citizens only. Staff/partner accounts
    are provisioned exclusively by System Admins via the internal
    admin console - never through public signup.
    """
    password = serializers.CharField(write_only=True, min_length=12)
    password_confirm = serializers.CharField(write_only=True, min_length=12)

    class Meta:
        model = User
        fields = ['username', 'email', 'phone_number', 'password', 'password_confirm']

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        password_validation.validate_password(attrs['password'])
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User(role=UserRole.CITIZEN, **validated_data)
        user.set_password(password)
        user.save()
        return user


class StaffProvisioningSerializer(serializers.ModelSerializer):
    """
    Admin-only endpoint serializer for provisioning internal staff and
    external partner accounts with an explicit role assignment.
    """
    password = serializers.CharField(write_only=True, min_length=12)

    class Meta:
        model = User
        fields = [
            'username', 'email', 'phone_number', 'role',
            'organization_name', 'organization_code', 'password',
        ]

    def validate_role(self, value):
        if value == UserRole.CITIZEN:
            raise serializers.ValidationError(
                "Citizens self-register via the public portal, not the staff provisioning endpoint."
            )
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'role', 'phone_number',
            'organization_name', 'organization_code',
            'is_identity_verified', 'is_mfa_enabled', 'is_active', 'is_suspended', 'created_at',
        ]
        read_only_fields = fields


class PasswordResetRequestSerializer(serializers.Serializer):
    """
    Accepts either username or email - staff/partner accounts should be
    able to use whichever they remember. Deliberately does not validate
    that the identifier exists (the view returns the same generic
    response either way) to avoid leaking which usernames/emails are
    registered.
    """
    identifier = serializers.CharField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField()
    new_password = serializers.CharField(min_length=12, write_only=True)

    def validate_new_password(self, value):
        password_validation.validate_password(value)
        return value