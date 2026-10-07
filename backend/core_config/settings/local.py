from .base import *  # noqa

DEBUG = True

# Relaxed throttles for local development/testing
REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {  # noqa: F405
    'citizen_intake': '1000/hour',
    'auth_login': '1000/minute',
    'admin_action': '1000/minute',
    'telegram_webhook': '1000/minute',
}

CORS_ALLOW_ALL_ORIGINS = True

EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
