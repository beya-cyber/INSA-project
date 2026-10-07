"""
Shared tracking-code resolution helper.

Every client-facing surface in NDSIR (citizens, analysts, bank agents)
identifies a case by its human-readable tracking code, never by the
internal UUID primary key - that PK is an implementation detail and
should never need to be typed, copied, or known by any user. Endpoints
that create related objects (evidence, freeze orders, telecom orders,
legal export packages) accept `report_tracking_code` and resolve it
here rather than exposing `report` as a raw PK-relation field.
"""
from rest_framework import serializers
from apps.incidents.models import IncidentReport


def resolve_report_or_raise(tracking_code: str) -> IncidentReport:
    try:
        return IncidentReport.objects.get(tracking_code=tracking_code)
    except IncidentReport.DoesNotExist:
        raise serializers.ValidationError(
            {'report_tracking_code': f"No case found with tracking code '{tracking_code}'."}
        )
