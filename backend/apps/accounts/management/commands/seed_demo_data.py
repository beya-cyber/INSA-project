"""
Seeds realistic demo data for local testing and reviewer walkthroughs:
staff/partner accounts (matching the frontend's demo usernames), victim
profiles, incident reports at various risk levels, a transaction hop,
a scam linkage edge, a freeze order, and a couple of audit log entries.

Usage:
    python manage.py seed_demo_data
    python manage.py seed_demo_data --flush   # wipe and reseed

This is intended for development/staging/demo environments only. It is
never invoked automatically by the Docker entrypoint - running it is
always an explicit, deliberate choice.
"""
from datetime import timedelta

from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User, UserRole
from apps.incidents.models import (
    VictimProfile, IncidentReport, IncidentChannel, IncidentType, IncidentStatus,
)
from apps.forensics.models import TransactionLedgerEntry, ScamLinkageEdge, LinkageEdgeType
from apps.integrations.models import AssetFreezeOrder, FreezeOrderStatus
from apps.audit_logs.models import ActionAuditLog

# Matches the frontend AuthContext.DEMO_USERS map, so the same usernames
# work whether the person clicks the frontend's local demo shortcut or
# actually authenticates against this real backend.
DEMO_PASSWORD = 'NdsirDemo!2026'

STAFF_USERS = [
    dict(username='analyst.demo', role=UserRole.INSA_ANALYST, organization_code='INSA', is_mfa_enabled=True),
    dict(username='supervisor.demo', role=UserRole.INSA_SUPERVISOR, organization_code='INSA', is_mfa_enabled=True),
    dict(username='auditor.demo', role=UserRole.AUDITOR, organization_code='INSA', is_mfa_enabled=True),
    dict(username='admin.demo', role=UserRole.ADMIN, organization_code='INSA', is_mfa_enabled=True),
    dict(username='bank.demo', role=UserRole.BANK_AGENT, organization_code='CBE', is_mfa_enabled=False),
    dict(username='police.demo', role=UserRole.POLICE_LIAISON, organization_code='FEDPOL-CIB', is_mfa_enabled=False),
]


class Command(BaseCommand):
    help = 'Seed realistic NDSIR demo data for local testing.'

    def add_arguments(self, parser):
        parser.add_argument('--flush', action='store_true', help='Delete existing demo data before reseeding.')

    def handle(self, *args, **options):
        if options['flush']:
            self._flush()

        with transaction.atomic():
            users = self._seed_users()
            reports = self._seed_reports(users)
            self._seed_transaction_and_linkage(reports)
            self._seed_freeze_order(reports, users)
            self._seed_audit_logs(reports, users)

        self.stdout.write(self.style.SUCCESS(
            f"\nSeeded {len(STAFF_USERS)} staff/partner accounts and {len(reports)} incident reports.\n"
            f"Log in at /api/v1/auth/login/ with any of the usernames below and password: {DEMO_PASSWORD}\n"
            f"  " + ", ".join(u['username'] for u in STAFF_USERS)
        ))

    def _flush(self):
        # Note: QuerySet.delete() is a bulk operation that issues SQL
        # DELETE directly - it does not call each instance's overridden
        # delete(), so ActionAuditLog's immutability guard (which only
        # blocks instance.delete()) doesn't interfere with reseeding.
        ActionAuditLog.objects.all().delete()
        AssetFreezeOrder.objects.all().delete()
        TransactionLedgerEntry.objects.all().delete()
        ScamLinkageEdge.objects.all().delete()
        IncidentReport.objects.all().delete()
        VictimProfile.objects.all().delete()
        User.objects.filter(username__in=[u['username'] for u in STAFF_USERS]).delete()
        self.stdout.write(self.style.WARNING('Flushed existing demo data.'))

    def _seed_users(self):
        users = {}
        for spec in STAFF_USERS:
            user, created = User.objects.get_or_create(
                username=spec['username'],
                defaults=dict(
                    password=make_password(DEMO_PASSWORD),
                    role=spec['role'],
                    organization_code=spec['organization_code'],
                    is_mfa_enabled=spec['is_mfa_enabled'],
                    is_identity_verified=True,
                    email=f"{spec['username'].replace('.', '_')}@ndsir.local",
                ),
            )
            users[spec['username']] = user
            if created:
                self.stdout.write(f"  created user: {spec['username']} ({spec['role']})")
        return users

    def _seed_reports(self, users):
        victims = [
            dict(full_name='Selamawit Tesfaye', phone_number='0911000001'),
            dict(full_name='Dawit Alemu', phone_number='0911000002'),
            dict(full_name='Rahel Girma', phone_number='0911000003'),
            dict(full_name='Mekdes Bekele', phone_number='0911000004'),
            dict(full_name='Yonas Kebede', phone_number='0911000005'),
            dict(full_name='Hanna Solomon', phone_number='0911000006'),
        ]
        report_specs = [
            dict(v=0, channel=IncidentChannel.WEB, itype=IncidentType.MOBILE_BANKING_FRAUD,
                 status=IncidentStatus.ESCALATED, risk=82, scammer_phone='0922000001', scammer_acct='1000123456789',
                 desc='Received an SMS claiming to be from CBE fraud department; PIN reset link led to unauthorized transfer.'),
            dict(v=1, channel=IncidentChannel.TELEGRAM, itype=IncidentType.PHISHING,
                 status=IncidentStatus.IN_REVIEW, risk=45, scammer_phone='0922000002', scammer_acct=None,
                 desc='Clicked a phishing link disguised as a Telebirr promotion.'),
            dict(v=2, channel=IncidentChannel.IVR, itype=IncidentType.VOICE_SCAM,
                 status=IncidentStatus.FROZEN, risk=91, scammer_phone='0922000001', scammer_acct='1000123456789',
                 desc='Caller impersonating a bank officer requested OTP over the phone.'),
            dict(v=3, channel=IncidentChannel.WEB, itype=IncidentType.SIM_SWAP,
                 status=IncidentStatus.PENDING, risk=24, scammer_phone=None, scammer_acct=None,
                 desc='SIM stopped working; suspected unauthorized SIM swap at a carrier retail outlet.'),
            dict(v=4, channel=IncidentChannel.TELEGRAM, itype=IncidentType.SMS_IMPERSONATION,
                 status=IncidentStatus.IN_REVIEW, risk=58, scammer_phone='0922000003', scammer_acct=None,
                 desc='SMS impersonating Awash Bank asking to confirm account details via a link.'),
            dict(v=5, channel=IncidentChannel.WEB, itype=IncidentType.MOBILE_BANKING_FRAUD,
                 status=IncidentStatus.CLOSED, risk=12, scammer_phone=None, scammer_acct=None,
                 desc='Reported suspicious transfer request; resolved as a false alarm after verification.'),
        ]

        reports = []
        for spec in report_specs:
            v = victims[spec['v']]
            victim, _ = VictimProfile.objects.get_or_create(
                phone_number=v['phone_number'],
                defaults=dict(full_name=v['full_name'], is_verified=True, verification_timestamp=timezone.now()),
            )
            report, created = IncidentReport.objects.get_or_create(
                victim=victim,
                incident_type=spec['itype'],
                defaults=dict(
                    channel=spec['channel'],
                    status=spec['status'],
                    risk_score=spec['risk'],
                    description=spec['desc'],
                    scammer_phone_number=spec['scammer_phone'],
                    scammer_identifier=spec['scammer_acct'],
                    assigned_analyst=users.get('analyst.demo') if spec['status'] != 'PENDING' else None,
                    consent_given=True,
                    consent_recorded_at=timezone.now(),
                ),
            )
            reports.append(report)
            if created:
                self.stdout.write(f"  created report: {report.tracking_code} [{report.status}] risk={report.risk_score}")
        return reports

    def _seed_transaction_and_linkage(self, reports):
        # Reports 0 and 2 share the same destination account and scammer
        # phone - demonstrates the linkage graph and multi-hop traversal.
        shared_reports = [reports[0], reports[2]]
        for i, report in enumerate(shared_reports):
            TransactionLedgerEntry.objects.get_or_create(
                report=report, hop_level=0,
                defaults=dict(
                    source_bank='CBE', destination_bank='TELEBIRR',
                    destination_account='1000123456789', amount=15500.00,
                    timestamp=timezone.now() - timedelta(days=3),
                ),
            )
            TransactionLedgerEntry.objects.get_or_create(
                report=report, hop_level=1,
                defaults=dict(
                    source_bank='TELEBIRR', destination_bank='AWASH',
                    destination_account='0911223344', amount=14000.00,
                    is_flagged_endpoint=True,
                    timestamp=timezone.now() - timedelta(days=2),
                ),
            )
        ScamLinkageEdge.objects.get_or_create(
            source_report=shared_reports[0], target_report=shared_reports[1],
            edge_type=LinkageEdgeType.SHARED_DESTINATION_ACCOUNT, shared_value='1000123456789',
        )
        self.stdout.write("  seeded transaction ledger + linkage edge for linked cases")

    def _seed_freeze_order(self, reports, users):
        order, created = AssetFreezeOrder.objects.get_or_create(
            report=reports[2],  # the FROZEN case
            account_number='1000123456789',
            defaults=dict(
                destination_bank_code='CBE',
                reason='Confirmed phishing/voice-scam destination account from OCR-verified receipt and call log.',
                proposed_by=users.get('analyst.demo'),
                approved_by=users.get('supervisor.demo'),
                status=FreezeOrderStatus.ACKNOWLEDGED,
                ethswitch_order_reference='ETHSW-DEMO-0001',
                approved_at=timezone.now() - timedelta(hours=6),
                acknowledged_at=timezone.now() - timedelta(hours=5),
            ),
        )
        if created:
            self.stdout.write("  created freeze order for frozen case")

    def _seed_audit_logs(self, reports, users):
        entries = [
            dict(actor=users.get('analyst.demo'), action_type='PROPOSE_FREEZE', target=reports[2].id,
                 payload={'account_number': '1000123456789'}),
            dict(actor=users.get('supervisor.demo'), action_type='APPROVE_FREEZE', target=reports[2].id,
                 payload={'account_number': '1000123456789'}),
            dict(actor=users.get('supervisor.demo'), action_type='EXPORT_COURT_PACKAGE', target=reports[2].id,
                 payload={'note': 'Demo seed data'}),
        ]
        for e in entries:
            ActionAuditLog.objects.create(
                actor=e['actor'], action_type=e['action_type'], target_report_id=e['target'],
                ip_address='127.0.0.1', payload_snapshot=e['payload'],
            )
        self.stdout.write("  seeded audit log entries")
