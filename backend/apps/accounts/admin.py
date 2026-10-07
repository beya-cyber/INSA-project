from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from .models import User, RefreshTokenDeviceBinding, PasswordResetToken


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    list_display = ('username', 'email', 'role', 'organization_code', 'is_identity_verified', 'is_mfa_enabled', 'is_suspended', 'is_active')
    list_filter = ('role', 'is_identity_verified', 'is_mfa_enabled', 'is_suspended', 'is_active')
    search_fields = ('username', 'email', 'phone_number', 'organization_name')
    fieldsets = DjangoUserAdmin.fieldsets + (
        ('NDSIR Role & Identity', {
            'fields': ('role', 'fayda_id_hash', 'is_identity_verified', 'phone_number',
                       'organization_name', 'organization_code')
        }),
        ('Security', {
            'fields': ('is_mfa_enabled', 'is_suspended', 'failed_login_attempts', 'locked_until')
        }),
    )


@admin.register(RefreshTokenDeviceBinding)
class RefreshTokenDeviceBindingAdmin(admin.ModelAdmin):
    list_display = ('user', 'ip_address', 'issued_at', 'revoked')
    list_filter = ('revoked',)
    search_fields = ('user__username', 'ip_address')


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ('user', 'created_at', 'expires_at', 'used_at', 'requested_ip')
    list_filter = ('used_at',)
    search_fields = ('user__username',)
    readonly_fields = ('token',)
