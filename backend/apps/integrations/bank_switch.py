"""
EthSwitch / Bank backend integration wrapper (Module 3: Central Bank &
Financial Switch Integration). Issues one-click administrative freeze
orders and receives execution acknowledgments from bank agents.

Every call is HMAC-signed for message integrity and is always preceded
by an authenticated, MFA-verified Supervisor approval at the API-view
layer - this module never authorizes actions on its own.
"""
import hashlib
import hmac
import json
import logging
import time
import uuid

import requests
from django.conf import settings
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

logger = logging.getLogger('ndsir')


class BankSwitchError(Exception):
    pass


class EthSwitchClient:
    def __init__(self):
        self.base_url = settings.ETHSWITCH_API_BASE_URL.rstrip('/')
        self.api_key = settings.ETHSWITCH_API_KEY
        self.hmac_secret = settings.ETHSWITCH_HMAC_SECRET.encode()

    def _sign(self, body: dict) -> str:
        payload = json.dumps(body, sort_keys=True, separators=(',', ':')).encode()
        return hmac.new(self.hmac_secret, payload, hashlib.sha256).hexdigest()

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10),
           retry=retry_if_exception_type(requests.RequestException))
    def issue_asset_freeze(self, *, destination_bank_code: str, account_number: str,
                            report_tracking_code: str, approving_supervisor_id: str,
                            reason: str) -> dict:
        """
        Issues a temporary administrative asset freeze order to the
        target bank via EthSwitch. Returns the switch's order reference
        for audit-log correlation.
        """
        idempotency_key = str(uuid.uuid4())
        body = {
            'idempotency_key': idempotency_key,
            'destination_bank_code': destination_bank_code,
            'account_number': account_number,
            'freeze_type': 'TEMPORARY_ADMINISTRATIVE_HOLD',
            'reference': report_tracking_code,
            'authorized_by': approving_supervisor_id,
            'reason': reason,
            'requested_at': int(time.time()),
        }
        signature = self._sign(body)

        try:
            response = requests.post(
                f'{self.base_url}/holds',
                json=body,
                headers={
                    'Authorization': f'Bearer {self.api_key}',
                    'X-Signature': signature,
                    'Idempotency-Key': idempotency_key,
                },
                timeout=15,
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            logger.error("EthSwitch freeze order failed for %s: %s", report_tracking_code, exc)
            raise BankSwitchError(str(exc)) from exc

        result = response.json()
        logger.info("EthSwitch freeze order issued: report=%s order_ref=%s",
                    report_tracking_code, result.get('order_reference'))
        return result

    def check_hold_status(self, order_reference: str) -> dict:
        response = requests.get(
            f'{self.base_url}/holds/{order_reference}',
            headers={'Authorization': f'Bearer {self.api_key}'},
            timeout=10,
        )
        response.raise_for_status()
        return response.json()

    def verify_bank_acknowledgment_signature(self, body: bytes, provided_signature: str) -> bool:
        """Validates inbound acknowledgment webhooks from bank partners."""
        expected = hmac.new(self.hmac_secret, body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, provided_signature)
