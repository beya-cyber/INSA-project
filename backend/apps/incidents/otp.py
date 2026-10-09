"""
Phone-ownership OTP for the public citizen intake wizard.

Flow
  1. POST /incidents/otp/request/  {phone}        -> 6-digit code cached in Redis for 5 min
  2. POST /incidents/otp/verify/   {phone, code}  -> {verified, verification_token}
  3. POST /incidents/submit/       {..., verification_token}

Only an HMAC of the code is stored in the cache (never the code itself), wrong
guesses are capped, and the verification token is bound to the phone number,
expires, and can be used for exactly one submission.
"""
import hashlib
import hmac
import re
import secrets
import time

from django.conf import settings
from django.core.cache import cache
from rest_framework.throttling import SimpleRateThrottle

# 9XXXXXXXX (Ethio Telecom) or 7XXXXXXXX (Safaricom Ethiopia), with optional 0 / 251 / +251 prefix.
ET_MOBILE_RE = re.compile(r'^(?:\+?251|0)?([79]\d{8})$')
ET_MOBILE_MESSAGE = 'Enter a valid Ethiopian mobile number (e.g. 0911223344 or +251711223344).'


def normalize_phone(raw):
    """'0911 22 33 44' / '+251911223344' / '911223344' -> '+251911223344'. None if invalid."""
    cleaned = re.sub(r'[\s\-()]', '', str(raw or ''))
    match = ET_MOBILE_RE.match(cleaned)
    return f'+251{match.group(1)}' if match else None


def _key(label):
    return hashlib.sha256(f'ndsir-otp:{label}:{settings.SECRET_KEY}'.encode()).digest()


def _mac(label, message):
    return hmac.new(_key(label), message.encode(), hashlib.sha256).hexdigest()


def _otp_cache_key(phone):
    return f'otp:{phone}'


def issue_code(phone):
    """Generate a fresh code for `phone`, replacing any previous one. Returns the plaintext code."""
    code = str(secrets.randbelow(10 ** settings.OTP_CODE_LENGTH)).zfill(settings.OTP_CODE_LENGTH)
    cache.set(
        _otp_cache_key(phone),
        {'mac': _mac('code', f'{phone}:{code}'), 'attempts': 0, 'expires_at': time.time() + settings.OTP_TTL_SECONDS},
        timeout=settings.OTP_TTL_SECONDS,
    )
    return code


def check_code(phone, code):
    """Returns (ok, reason). reason in {None, 'expired', 'invalid', 'locked'}."""
    key = _otp_cache_key(phone)
    entry = cache.get(key)
    if not entry:
        return False, 'expired'
    if entry['attempts'] >= settings.OTP_MAX_VERIFY_ATTEMPTS:
        cache.delete(key)
        return False, 'locked'

    if hmac.compare_digest(entry['mac'], _mac('code', f'{phone}:{str(code).strip()}')):
        cache.delete(key)  # a code works once
        return True, None

    entry['attempts'] += 1
    if entry['attempts'] >= settings.OTP_MAX_VERIFY_ATTEMPTS:
        cache.delete(key)
        return False, 'locked'
    # keep the ORIGINAL expiry - a wrong guess must not extend the code's life
    remaining = int(entry['expires_at'] - time.time())
    if remaining <= 0:
        cache.delete(key)
        return False, 'expired'
    cache.set(key, entry, timeout=remaining)
    return False, 'invalid'


# --------------------------------------------------------------------------- verification token
def make_verification_token(phone):
    """Signed proof that `phone` passed the OTP check: '<ts>.<nonce>.<hmac>'."""
    ts = str(int(time.time()))
    nonce = secrets.token_hex(8)
    return f'{ts}.{nonce}.{_mac("token", f"{phone}|{ts}|{nonce}")}'


def validate_verification_token(phone, token):
    """Returns (ok, reason) without consuming the token. reason in {None, 'invalid', 'expired', 'used'}."""
    try:
        ts, nonce, sig = str(token).split('.')
        issued = int(ts)
    except (ValueError, AttributeError):
        return False, 'invalid'
    if not hmac.compare_digest(sig, _mac('token', f'{phone}|{ts}|{nonce}')):
        return False, 'invalid'
    if time.time() - issued > settings.OTP_TOKEN_TTL_SECONDS:
        return False, 'expired'
    if cache.get(f'otp_used:{nonce}'):
        return False, 'used'
    return True, None


def consume_verification_token(token):
    """
    Mark a token as spent so one verification can't file multiple reports.
    Atomic (cache.add): returns False if another request already consumed it.
    """
    nonce = str(token).split('.')[1]
    return cache.add(f'otp_used:{nonce}', 1, timeout=settings.OTP_TOKEN_TTL_SECONDS + 60)


# --------------------------------------------------------------------------- throttle
class PhoneOtpRequestThrottle(SimpleRateThrottle):
    """Max OTP_REQUESTS_PER_WINDOW (3) code requests per phone number per 15 minutes."""
    scope = 'otp_request'

    def __init__(self):
        self.num_requests = settings.OTP_REQUESTS_PER_WINDOW
        self.duration = settings.OTP_REQUEST_WINDOW_SECONDS
        self.rate = f'{self.num_requests}/{self.duration}s'  # informational; parse_rate is bypassed

    def get_cache_key(self, request, view):
        phone = normalize_phone(request.data.get('phone'))
        if not phone:
            return None  # invalid phone -> the view returns 400, nothing to throttle
        return self.cache_format % {'scope': self.scope, 'ident': hashlib.sha256(phone.encode()).hexdigest()}
