"""
Fayda National Digital ID eKYC integration client
(Module 2: National Fayda eKYC Validation).

Verifies victim identities prior to executing administrative locks,
preventing false or malicious account freeze attempts.
"""
import hashlib
import logging

import requests
from django.conf import settings
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

logger = logging.getLogger('ndsir')


class FaydaEKYCError(Exception):
    pass


class FaydaEKYCClient:
    """
    Thin, resilient wrapper around the Fayda eKYC verification API.
    Only a salted SHA-256 hash of the national ID is ever persisted -
    the raw ID number never touches NDSIR's database, per data
    minimization requirements.
    """

    def __init__(self):
        self.base_url = settings.FAYDA_EKYC_BASE_URL.rstrip('/')
        self.client_id = settings.FAYDA_CLIENT_ID
        self.client_secret = settings.FAYDA_CLIENT_SECRET

    def _headers(self):
        return {
            'Authorization': f'Bearer {self._get_access_token()}',
            'Content-Type': 'application/json',
        }

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=8),
           retry=retry_if_exception_type(requests.RequestException))
    def _get_access_token(self) -> str:
        response = requests.post(
            f'{self.base_url}/oauth/token',
            data={
                'grant_type': 'client_credentials',
                'client_id': self.client_id,
                'client_secret': self.client_secret,
                'scope': 'ekyc.verify',
            },
            timeout=10,
        )
        response.raise_for_status()
        return response.json()['access_token']

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=8),
           retry=retry_if_exception_type(requests.RequestException))
    def initiate_verification(self, fayda_id_number: str, phone_number: str) -> dict:
        """Starts an OTP-based eKYC challenge; returns a short-lived session id."""
        response = requests.post(
            f'{self.base_url}/ekyc/initiate',
            json={'fayda_id_number': fayda_id_number, 'phone_number': phone_number},
            headers=self._headers(),
            timeout=10,
        )
        response.raise_for_status()
        return response.json()

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=8),
           retry=retry_if_exception_type(requests.RequestException))
    def verify_token(self, verification_token: str) -> dict:
        """
        Confirms a completed eKYC challenge. Returns:
        {"verified": bool, "fayda_id_hash": str, "full_name": str (optional)}
        """
        try:
            response = requests.post(
                f'{self.base_url}/ekyc/confirm',
                json={'verification_token': verification_token},
                headers=self._headers(),
                timeout=10,
            )
            response.raise_for_status()
            payload = response.json()
        except requests.RequestException as exc:
            logger.error("Fayda eKYC confirmation request failed: %s", exc)
            raise FaydaEKYCError(str(exc)) from exc

        raw_id = payload.get('fayda_id_number')
        return {
            'verified': bool(payload.get('verified')),
            'fayda_id_hash': self._hash_id(raw_id) if raw_id else None,
            'full_name': payload.get('full_name'),
        }

    @staticmethod
    def _hash_id(raw_id_number: str) -> str:
        salt = settings.SECRET_KEY[:16]
        return hashlib.sha256(f'{salt}:{raw_id_number}'.encode()).hexdigest()
