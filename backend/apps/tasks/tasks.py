"""
Celery task handlers. Kept intentionally thin - each task delegates to
the relevant domain module (forensics, integrations) so business logic
stays testable outside of the async task runner.
"""
import logging

from celery import shared_task

logger = logging.getLogger('ndsir')


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def run_ocr_pipeline(self, evidence_file_id: str):
    """Runs OCR extraction + image authenticity checks on an uploaded evidence file."""
    from apps.incidents.models import EvidenceFile, AuthenticityFlag
    from apps.forensics.ocr_engine import OCRExtractionEngine
    from apps.forensics.image_authenticator import ImageAuthenticator

    try:
        evidence = EvidenceFile.objects.select_related('report').get(id=evidence_file_id)
    except EvidenceFile.DoesNotExist:
        logger.error("run_ocr_pipeline: evidence %s not found", evidence_file_id)
        return

    try:
        if evidence.file_type == 'IMAGE' and evidence.file:
            file_path = evidence.file.path

            ocr_result = OCRExtractionEngine().parse(file_path)
            evidence.ocr_parsed_json = ocr_result.to_json()

            auth_report = ImageAuthenticator().analyze(file_path)
            evidence.authenticity_flag = (
                AuthenticityFlag.FLAGGED if auth_report.is_flagged else AuthenticityFlag.VALID
            )
            evidence.authenticity_notes = '; '.join(auth_report.findings)
        elif evidence.file_type == 'IMAGE':
            # An IMAGE-typed record with no local file (shouldn't normally
            # happen - web/Telegram intake always stores locally - but
            # fail safe rather than crash the task on a bad record).
            logger.warning("run_ocr_pipeline: evidence %s is IMAGE type but has no local file", evidence_file_id)

        evidence.save(update_fields=['ocr_parsed_json', 'authenticity_flag', 'authenticity_notes'])

        run_linkage_analysis.delay(str(evidence.report_id))

    except Exception as exc:  # noqa: BLE001
        logger.error("run_ocr_pipeline failed for %s: %s", evidence_file_id, exc)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=15)
def run_linkage_analysis(self, report_id: str):
    """Recomputes scam linkage graph edges and the report's risk score."""
    from apps.incidents.models import IncidentReport
    from apps.forensics.linkage_graph import LinkageAnalysisEngine

    try:
        report = IncidentReport.objects.select_related('victim').get(id=report_id)
    except IncidentReport.DoesNotExist:
        logger.error("run_linkage_analysis: report %s not found", report_id)
        return

    try:
        score = LinkageAnalysisEngine().analyze_report(report)
        logger.info("Linkage analysis complete for %s: score=%s", report.tracking_code, score)
    except Exception as exc:  # noqa: BLE001
        logger.error("run_linkage_analysis failed for %s: %s", report_id, exc)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=5, default_retry_delay=60)
def execute_bank_freeze_order(self, order_id: str):
    """Dispatches an approved asset freeze order to EthSwitch."""
    from apps.integrations.models import AssetFreezeOrder, FreezeOrderStatus
    from apps.integrations.bank_switch import EthSwitchClient, BankSwitchError

    try:
        order = AssetFreezeOrder.objects.select_related('report', 'approved_by').get(id=order_id)
    except AssetFreezeOrder.DoesNotExist:
        logger.error("execute_bank_freeze_order: order %s not found", order_id)
        return

    try:
        result = EthSwitchClient().issue_asset_freeze(
            destination_bank_code=order.destination_bank_code,
            account_number=order.account_number,
            report_tracking_code=order.report.tracking_code,
            approving_supervisor_id=str(order.approved_by_id),
            reason=order.reason,
        )
        order.ethswitch_order_reference = result.get('order_reference')
        order.status = FreezeOrderStatus.SENT
        order.save(update_fields=['ethswitch_order_reference', 'status'])
        logger.info("Freeze order %s dispatched: ref=%s", order_id, order.ethswitch_order_reference)
    except BankSwitchError as exc:
        order.status = FreezeOrderStatus.FAILED
        order.save(update_fields=['status'])
        logger.error("execute_bank_freeze_order failed for %s: %s", order_id, exc)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=5, default_retry_delay=60)
def execute_telecom_escalation_order(self, order_id: str):
    """Dispatches an approved SIM/IMEI action to the relevant telecom carrier."""
    from apps.integrations.models import TelecomEscalationOrder, FreezeOrderStatus, TelecomActionType
    from apps.integrations.telecom_client import get_telecom_client, TelecomIntegrationError

    try:
        order = TelecomEscalationOrder.objects.select_related('report').get(id=order_id)
    except TelecomEscalationOrder.DoesNotExist:
        logger.error("execute_telecom_escalation_order: order %s not found", order_id)
        return

    try:
        client = get_telecom_client(order.carrier)
        if order.action_type == TelecomActionType.SIM_SUSPEND:
            result = client.suspend_sim(order.target_value, report_tracking_code=order.report.tracking_code, reason=order.reason)
        else:
            result = client.blacklist_imei(order.target_value, report_tracking_code=order.report.tracking_code, reason=order.reason)

        order.carrier_reference = result.get('reference') or result.get('case_id')
        order.status = FreezeOrderStatus.SENT
        order.save(update_fields=['carrier_reference', 'status'])
        logger.info("Telecom order %s dispatched to %s", order_id, order.carrier)
    except TelecomIntegrationError as exc:
        order.status = FreezeOrderStatus.FAILED
        order.save(update_fields=['status'])
        logger.error("execute_telecom_escalation_order failed for %s: %s", order_id, exc)
        raise self.retry(exc=exc)


@shared_task
def send_status_update_sms_task(report_id: str, status: str):
    """
    Notifies a victim of a status change worth interrupting them for
    (see sms_gateway._STATUS_MESSAGES for which statuses qualify).
    Kept as its own tiny task, separate from send_submission_confirmation,
    so a notification failure here can never affect the status change
    itself - the report is already saved by the time this runs.
    """
    from apps.incidents.models import IncidentReport
    from apps.integrations.sms_gateway import send_case_status_update_sms

    try:
        report = IncidentReport.objects.select_related('victim').get(id=report_id)
    except IncidentReport.DoesNotExist:
        logger.error("send_status_update_sms_task: report %s not found", report_id)
        return

    try:
        send_case_status_update_sms(report.victim.phone_number, report.tracking_code, status)
        logger.info("Status-update SMS dispatched for %s (%s)", report.tracking_code, status)
    except Exception as exc:  # noqa: BLE001
        logger.warning("send_status_update_sms_task failed for %s: %s", report_id, exc)


@shared_task
def send_submission_confirmation(report_id: str):
    """
    Sends a confirmation SMS with the tracking code after intake. SMS,
    not email, is the primary channel here: VictimProfile intentionally
    has no email field, since citizens reporting scams are reached by
    phone, and requiring an email address would be a real access
    barrier for a national-scale public service.
    """
    from apps.incidents.models import IncidentReport
    from apps.integrations.sms_gateway import send_case_confirmation_sms

    try:
        report = IncidentReport.objects.select_related('victim').get(id=report_id)
    except IncidentReport.DoesNotExist:
        logger.error("send_submission_confirmation: report %s not found", report_id)
        return

    victim = report.victim
    try:
        send_case_confirmation_sms(victim.phone_number, report.tracking_code)
        logger.info("Submission confirmation SMS dispatched for %s", report.tracking_code)
    except Exception as exc:  # noqa: BLE001
        # Notification failure must never affect the already-saved report.
        logger.warning("send_submission_confirmation failed for %s: %s", report_id, exc)
