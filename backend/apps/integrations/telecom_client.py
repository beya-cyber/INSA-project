"""
Telecom & Device Escalation integration wrappers (Module 4).
Dispatches SIM and IMEI blacklist notifications to Ethio Telecom and
Safaricom Ethiopia for numbers/devices linked to verified scam
campaigns. Each carrier has a distinct API surface, unified here
behind a common interface.
"""
import logging
from abc import ABC, abstractmethod

import requests
from django.conf import settings
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

logger = logging.getLogger('ndsir')


class TelecomIntegrationError(Exception):
    pass


class BaseTelecomClient(ABC):
    @abstractmethod
    def suspend_sim(self, phone_number: str, *, report_tracking_code: str, reason: str) -> dict:
        ...

    @abstractmethod
    def blacklist_imei(self, imei: str, *, report_tracking_code: str, reason: str) -> dict:
        ...


class EthioTelecomClient(BaseTelecomClient):
    def __init__(self):
        self.base_url = settings.ETHIO_TELECOM_API_BASE_URL.rstrip('/')
        self.api_key = settings.ETHIO_TELECOM_API_KEY

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10),
           retry=retry_if_exception_type(requests.RequestException))
    def suspend_sim(self, phone_number: str, *, report_tracking_code: str, reason: str) -> dict:
        try:
            response = requests.post(
                f'{self.base_url}/sim/suspend',
                json={'msisdn': phone_number, 'reference': report_tracking_code, 'reason': reason},
                headers={'Authorization': f'Bearer {self.api_key}'},
                timeout=15,
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            logger.error("Ethio Telecom SIM suspension failed for %s: %s", phone_number, exc)
            raise TelecomIntegrationError(str(exc)) from exc
        return response.json()

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10),
           retry=retry_if_exception_type(requests.RequestException))
    def blacklist_imei(self, imei: str, *, report_tracking_code: str, reason: str) -> dict:
        try:
            response = requests.post(
                f'{self.base_url}/eir/blacklist',
                json={'imei': imei, 'reference': report_tracking_code, 'reason': reason},
                headers={'Authorization': f'Bearer {self.api_key}'},
                timeout=15,
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            logger.error("Ethio Telecom IMEI blacklist failed for %s: %s", imei, exc)
            raise TelecomIntegrationError(str(exc)) from exc
        return response.json()


class SafaricomEthiopiaClient(BaseTelecomClient):
    def __init__(self):
        self.base_url = settings.SAFARICOM_ET_API_BASE_URL.rstrip('/')
        self.api_key = settings.SAFARICOM_ET_API_KEY

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10),
           retry=retry_if_exception_type(requests.RequestException))
    def suspend_sim(self, phone_number: str, *, report_tracking_code: str, reason: str) -> dict:
        try:
            response = requests.post(
                f'{self.base_url}/security/sim-suspend',
                json={'subscriber_msisdn': phone_number, 'case_reference': report_tracking_code, 'reason': reason},
                headers={'X-API-Key': self.api_key},
                timeout=15,
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            logger.error("Safaricom ET SIM suspension failed for %s: %s", phone_number, exc)
            raise TelecomIntegrationError(str(exc)) from exc
        return response.json()

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10),
           retry=retry_if_exception_type(requests.RequestException))
    def blacklist_imei(self, imei: str, *, report_tracking_code: str, reason: str) -> dict:
        try:
            response = requests.post(
                f'{self.base_url}/security/imei-blacklist',
                json={'imei': imei, 'case_reference': report_tracking_code, 'reason': reason},
                headers={'X-API-Key': self.api_key},
                timeout=15,
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            logger.error("Safaricom ET IMEI blacklist failed for %s: %s", imei, exc)
            raise TelecomIntegrationError(str(exc)) from exc
        return response.json()


def get_telecom_client(carrier: str) -> BaseTelecomClient:
    carrier = carrier.upper()
    if carrier in ('ETHIO_TELECOM', 'ETHIOTELECOM'):
        return EthioTelecomClient()
    if carrier in ('SAFARICOM', 'SAFARICOM_ET'):
        return SafaricomEthiopiaClient()
    raise ValueError(f"Unknown carrier: {carrier}")
