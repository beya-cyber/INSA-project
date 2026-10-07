"""
Central helper for writing to the immutable audit ledger. All views
that perform privileged actions (freeze proposals/approvals, SIM
blacklisting, legal export) should call log_action() rather than
writing to ActionAuditLog directly, to guarantee consistent shape.
"""
from .models import ActionAuditLog


def log_action(*, actor, action_type: str, ip_address: str, payload: dict,
                target_report_id=None, target_entity: str = '', status_code: str = 'SUCCESS'):
    return ActionAuditLog.objects.create(
        actor=actor,
        action_type=action_type,
        target_report_id=target_report_id,
        target_entity=target_entity,
        status_code=status_code,
        ip_address=ip_address or '0.0.0.0',
        payload_snapshot=payload,
    )
