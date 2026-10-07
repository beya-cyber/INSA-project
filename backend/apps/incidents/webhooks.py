"""
Telegram Bot webhook listener and IVR ingestion receiver
(Module 1: Universal Citizen Evidence Intake Interface).

Implemented as APIView classes (rather than @api_view function views)
specifically so `throttle_scope` is a real class attribute DRF's
ScopedRateThrottle can read at request time - assigning it inside a
function body, as an earlier version of this file did, has no effect
because api_view() only inspects the function for that attribute once,
at decoration/import time, before the body ever runs.
"""
import hashlib
import hmac
import logging

from django.conf import settings
from django.db import transaction
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.tasks.tasks import run_linkage_analysis
from .models import VictimProfile, IncidentReport, EvidenceFile, IncidentChannel, IncidentType

logger = logging.getLogger('ndsir')


def _verify_telegram_secret(request):
    """
    Telegram sends the configured secret token in the
    X-Telegram-Bot-Api-Secret-Token header on every webhook call.
    """
    provided = request.headers.get('X-Telegram-Bot-Api-Secret-Token', '')
    expected = settings.TELEGRAM_WEBHOOK_SECRET
    return expected and hmac.compare_digest(provided, expected)


class TelegramWebhookView(APIView):
    """
    Receives Telegram Bot updates for scam evidence submissions.
    Expected minimal payload shape (mapped by the bot's conversation flow):
    {
        "message": {
            "chat": {"id": ...},
            "text": "...",
            "phone_number": "...",
            "photo": [{"file_id": "..."}],
            ...
        }
    }
    Full media download from Telegram's file API is delegated to a
    Celery task to keep the webhook response fast (<1s) as required
    by Telegram's delivery retry policy.
    """
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'telegram_webhook'

    def post(self, request):
        if not _verify_telegram_secret(request):
            logger.warning("Rejected Telegram webhook call - invalid secret token.")
            return Response({'detail': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

        payload = request.data
        message = payload.get('message', {})
        phone_number = message.get('contact', {}).get('phone_number') or message.get('phone_number')

        if not phone_number:
            return Response({'ok': True, 'note': 'awaiting phone number step'})

        with transaction.atomic():
            victim, _ = VictimProfile.objects.get_or_create(
                phone_number=phone_number,
                defaults={'full_name': message.get('from', {}).get('first_name', 'Telegram User')},
            )
            report = IncidentReport.objects.create(
                victim=victim,
                channel=IncidentChannel.TELEGRAM,
                incident_type=message.get('incident_type', IncidentType.OTHER),
                description=message.get('text', ''),
                scammer_phone_number=message.get('scammer_phone_number'),
            )

        run_linkage_analysis.delay(str(report.id))
        logger.info("Telegram intake created report=%s", report.tracking_code)

        return Response({'ok': True, 'tracking_code': report.tracking_code})


class IVRIntakeWebhookView(APIView):
    """
    Receives structured call-completion payloads from the IVR platform
    (e.g. Asterisk/FreePBX or a managed telephony provider) after a
    citizen logs a voice scam incident by phone.

    Expected payload:
    {
        "caller_phone_number": "...",
        "scammer_phone_number": "...",
        "call_timestamp": "...",
        "call_duration_seconds": 95,
        "recording_url": "https://ivr-storage/.../call123.wav"
    }
    """
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'telegram_webhook'

    def post(self, request):
        data = request.data
        caller_phone = data.get('caller_phone_number')
        if not caller_phone:
            return Response({'detail': 'caller_phone_number is required.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            victim, _ = VictimProfile.objects.get_or_create(
                phone_number=caller_phone,
                defaults={'full_name': 'IVR Caller'},
            )
            report = IncidentReport.objects.create(
                victim=victim,
                channel=IncidentChannel.IVR,
                incident_type=IncidentType.VOICE_SCAM,
                description=f"IVR call logged. Duration: {data.get('call_duration_seconds', 'unknown')}s",
                scammer_phone_number=data.get('scammer_phone_number'),
            )

            recording_url = data.get('recording_url')
            if recording_url:
                EvidenceFile.objects.create(
                    report=report,
                    external_url=recording_url,
                    file_type='AUDIO',
                    original_filename=recording_url.split('/')[-1],
                    file_hash_sha256=hashlib.sha256(recording_url.encode()).hexdigest(),
                )

        run_linkage_analysis.delay(str(report.id))
        logger.info("IVR intake created report=%s", report.tracking_code)

        return Response({'ok': True, 'tracking_code': report.tracking_code})


# Backward-compatible aliases for urls.py (`views.as_view()` pattern)
telegram_webhook = TelegramWebhookView.as_view()
ivr_intake_webhook = IVRIntakeWebhookView.as_view()
