"""
Granular Role-Based Access Control (RBAC) permission classes.
Implements the least-privilege matrix defined in the RBAC specification
(Section 3: Granular RBAC Permission Matrix).
"""
from rest_framework import permissions
from .models import UserRole


def _has_role(request, roles):
    return bool(
        request.user
        and request.user.is_authenticated
        and not getattr(request.user, 'is_suspended', False)
        and request.user.role in roles
    )


class IsCitizen(permissions.BasePermission):
    """Citizens may submit evidence and view only their own case status."""
    def has_permission(self, request, view):
        return _has_role(request, [UserRole.CITIZEN])


class IsINSAAnalyst(permissions.BasePermission):
    """Analysts (and Supervisors, who inherit analyst capability) may run
    OCR/forensics, linkage analysis, and propose freezes."""
    def has_permission(self, request, view):
        return _has_role(request, [UserRole.INSA_ANALYST, UserRole.INSA_SUPERVISOR])


class IsINSASupervisor(permissions.BasePermission):
    """Only Supervisors may approve/execute bank freezes, telecom
    suspensions, and sign off on court packages."""
    def has_permission(self, request, view):
        return _has_role(request, [UserRole.INSA_SUPERVISOR])


class IsAuditor(permissions.BasePermission):
    """Immutable read-only compliance auditor role."""
    def has_permission(self, request, view):
        return _has_role(request, [UserRole.AUDITOR])

    def has_object_permission(self, request, view, obj):
        # Auditors are strictly read-only, even at the object level.
        return request.method in permissions.SAFE_METHODS


class IsSystemAdmin(permissions.BasePermission):
    """Manages users, roles, and third-party API configuration keys."""
    def has_permission(self, request, view):
        return _has_role(request, [UserRole.ADMIN])


class IsBankAgent(permissions.BasePermission):
    """External bank / EthSwitch partner - may acknowledge freeze orders only."""
    def has_permission(self, request, view):
        return _has_role(request, [UserRole.BANK_AGENT])


class IsPoliceLiaison(permissions.BasePermission):
    """Federal Police CIB - may download exported forensic warrant packages."""
    def has_permission(self, request, view):
        return _has_role(request, [UserRole.POLICE_LIAISON])


class IsInvestigatorOrAuditorReadOnly(permissions.BasePermission):
    """
    Analysts/Supervisors get full read/write on triage resources.
    Auditors get read-only visibility into the same resources for compliance review.
    """
    def has_permission(self, request, view):
        if _has_role(request, [UserRole.INSA_ANALYST, UserRole.INSA_SUPERVISOR]):
            return True
        if request.method in permissions.SAFE_METHODS and _has_role(request, [UserRole.AUDITOR]):
            return True
        return False


class IsOwnerCitizenOrInvestigator(permissions.BasePermission):
    """
    Object-level permission: citizens may only access their own incident
    reports (matched by victim_profile linkage); investigators/auditors see all.
    """
    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.role in [UserRole.INSA_ANALYST, UserRole.INSA_SUPERVISOR, UserRole.AUDITOR, UserRole.ADMIN]:
            return True
        if user.role == UserRole.CITIZEN:
            victim = getattr(obj, 'victim', None)
            return victim is not None and victim.linked_user_id == user.id
        return False


class RequiresMFA(permissions.BasePermission):
    """
    Enforces MFA for any privileged administrative action (asset freezes,
    SIM/IMEI blacklisting, legal export). Blocks the action if the
    authenticated staff/admin account has not completed device verification.
    """
    message = "Multi-factor authentication is required to perform this action."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.role in [UserRole.CITIZEN, UserRole.BANK_AGENT, UserRole.POLICE_LIAISON]:
            return True  # MFA enforcement scoped to internal privileged roles
        return bool(user.is_mfa_enabled)
