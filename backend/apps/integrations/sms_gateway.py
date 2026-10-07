"""
SMS notification gateway (Module 1 support: confirmation messages to
citizens after intake, and status-change alerts).

Ethiopian citizens interacting with NDSIR are reached primarily by
phone, not email - VictimProfile has no email field at all - so SMS is
the primary, not secondary, notification channel for this system.
Implemented as a thin, provider-agnostic wrapper so swapping the actual
carrier/aggregator (e.g. a local Ethiopian SMS gateway, Twilio, Africa's
Talking) later only touches this one file.
"""
import logging

import requests
from django.conf import settings
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

logger = logging.getLogger('ndsir')


class SMSGatewayError(Exception):
    pass


class SMSGatewayClient:
    def __init__(self):
        self.api_key = settings.SMS_GATEWAY_API_KEY
        self.base_url = getattr(settings, 'SMS_GATEWAY_BASE_URL', '')
        self.sender_id = getattr(settings, 'SMS_GATEWAY_SENDER_ID', 'NDSIR')

    def is_configured(self) -> bool:
        return bool(self.api_key and self.base_url)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=8),
           retry=retry_if_exception_type(requests.RequestException))
    def send_sms(self, phone_number: str, message: str) -> dict:
        """
        Sends a single SMS. If no gateway is configured (e.g. local
        development, or before a real provider contract is in place),
        logs the message instead of raising - notification delivery
        should never be a hard dependency for the rest of the system
        to keep functioning.
        """
        if not self.is_configured():
            logger.info("SMS gateway not configured - would have sent to %s: %s", phone_number, message)
            return {'status': 'skipped', 'reason': 'gateway_not_configured'}

        try:
            response = requests.post(
                f"{self.base_url}/messages",
                json={'to': phone_number, 'from': self.sender_id, 'text': message},
                headers={'Authorization': f'Bearer {self.api_key}'},
                timeout=10,
            )
            response.raise_for_status()
            result = response.json()
            logger.info("SMS sent to %s: message_id=%s", phone_number, result.get('message_id'))
            return result
        except requests.RequestException as exc:
            logger.error("SMS send failed for %s: %s", phone_number, exc)
            raise SMSGatewayError(str(exc)) from exc


def send_case_confirmation_sms(phone_number: str, tracking_code: str, lang: str = 'en'):
    """Bilingual confirmation message - Amharic when the citizen's
    preferred language is known to be Amharic, English otherwise."""
    if lang == 'am':
        message = (
            f"የ NDSIR ጉዳይዎ ደርሷል። የመከታተያ ኮድዎ፦ {tracking_code}። "
            f"ሁኔታውን በ ndsir.insa.gov.et/track ላይ ይከታተሉ።"
        )
    else:
        message = (
            f"Your NDSIR report was received. Tracking code: {tracking_code}. "
            f"Check status anytime at ndsir.insa.gov.et/track."
        )
    try:
        return SMSGatewayClient().send_sms(phone_number, message)
    except SMSGatewayError:
        # A failed confirmation SMS must never block or fail the
        # underlying report submission - the report is already saved.
        return None


# Human-readable status text for the two channels/languages this system
# actively notifies on. Deliberately not the full IncidentStatus set -
# PENDING/IN_REVIEW are not worth interrupting someone's day for; the
# two statuses below are the ones a victim genuinely needs to know
# about promptly (their money got frozen, or their case was escalated).
_STATUS_MESSAGES = {
    'FROZEN': {
        'en': "Good news: the destination account in your NDSIR case {code} has been frozen.",
        'am': "መልካም ዜና፦ የNDSIR ጉዳይዎ {code} የመድረሻ አካውንት ታግዷል።",
    },
    'ESCALATED': {
        'en': "Your NDSIR case {code} has been escalated for urgent review by an INSA analyst.",
        'am': "የNDSIR ጉዳይዎ {code} በINSA መርማሪ አስቸኳይ ግምገማ እንዲደረግለት ተላልፏል።",
    },
}


def send_case_status_update_sms(phone_number: str, tracking_code: str, status: str, lang: str = 'en'):
    """
    Notifies a victim when their case reaches one of the small set of
    statuses worth an unprompted SMS (see _STATUS_MESSAGES). Silently
    does nothing for statuses not in that set - not every internal
    state transition is citizen-relevant, and over-notifying erodes
    trust in the messages that do matter.
    """
    template = _STATUS_MESSAGES.get(status, {}).get(lang) or _STATUS_MESSAGES.get(status, {}).get('en')
    if not template:
        return None
    message = template.format(code=tracking_code)
    try:
        return SMSGatewayClient().send_sms(phone_number, message)
    except SMSGatewayError:
        return None
