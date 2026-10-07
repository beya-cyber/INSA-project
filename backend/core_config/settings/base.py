"""
Base settings for the National Digital Scam Incident Response System (NDSIR).
Shared across local development and production environments.
"""
from pathlib import Path
from datetime import timedelta
from decouple import config, Csv

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = config('DJANGO_SECRET_KEY', default='insecure-dev-key-do-not-use-in-production')
DEBUG = config('DJANGO_DEBUG', default=False, cast=bool)
ALLOWED_HOSTS = config('DJANGO_ALLOWED_HOSTS', default='localhost,127.0.0.1', cast=Csv())

# ---------------------------------------------------------------------------
# Application definition
# ---------------------------------------------------------------------------
DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',
    'drf_spectacular',
    'django_celery_beat',
    'django_celery_results',
    'django_otp',
    'django_otp.plugins.otp_totp',
]

LOCAL_APPS = [
    'apps.accounts',
    'apps.incidents',
    'apps.forensics',
    'apps.integrations',
    'apps.audit_logs',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

AUTH_USER_MODEL = 'accounts.User'

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'core_config.middleware.SecurityHeadersMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django_otp.middleware.OTPMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'apps.audit_logs.middleware.RequestAuditMiddleware',
]

ROOT_URLCONF = 'core_config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core_config.wsgi.application'

# ---------------------------------------------------------------------------
# Database (SQLite - Local Development / Presentation Mode)
# ---------------------------------------------------------------------------
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# ---------------------------------------------------------------------------
# Password validation
# ---------------------------------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 12}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ---------------------------------------------------------------------------
# Internationalization
# ---------------------------------------------------------------------------
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Africa/Addis_Ababa'
USE_I18N = True
USE_TZ = True

# ---------------------------------------------------------------------------
# Static / Media files
# ---------------------------------------------------------------------------
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Evidence uploads (screenshots, receipts, audio) - kept isolated from public static assets
EVIDENCE_UPLOAD_ROOT = MEDIA_ROOT / 'evidence'
EVIDENCE_MAX_UPLOAD_SIZE_MB = 25
EVIDENCE_ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'pdf', 'mp3', 'wav', 'm4a', 'ogg']

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ---------------------------------------------------------------------------
# Django REST Framework
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 25,
    'DEFAULT_THROTTLE_CLASSES': (
        'rest_framework.throttling.ScopedRateThrottle',
    ),
    'DEFAULT_THROTTLE_RATES': {
        'citizen_intake': '20/hour',
        'auth_login': '10/minute',
        'admin_action': '120/minute',
        'telegram_webhook': '60/minute',
    },
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'EXCEPTION_HANDLER': 'core_config.exceptions.ndsir_exception_handler',
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'National Digital Scam Incident Response System API',
    'DESCRIPTION': 'INSA NDSIR backend: evidence intake, forensic triage, bank/telecom integration, legal export.',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

# ---------------------------------------------------------------------------
# Account lockout (brute-force protection at the account level, on top of
# ScopedRateThrottle's IP-level protection - see accounts/serializers.py)
# ---------------------------------------------------------------------------
ACCOUNT_LOCKOUT_THRESHOLD = config('ACCOUNT_LOCKOUT_THRESHOLD', default=5, cast=int)
ACCOUNT_LOCKOUT_MINUTES = config('ACCOUNT_LOCKOUT_MINUTES', default=15, cast=int)

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=config('JWT_ACCESS_TOKEN_LIFETIME_MIN', default=15, cast=int)),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=config('JWT_REFRESH_TOKEN_LIFETIME_DAYS', default=1, cast=int)),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = config('CORS_ALLOWED_ORIGINS', default='http://localhost:5173', cast=Csv())
CORS_ALLOW_CREDENTIALS = True

# Used to build absolute links back to the frontend (e.g. password reset emails)
FRONTEND_BASE_URL = config('FRONTEND_BASE_URL', default='http://localhost:5173')

# ---------------------------------------------------------------------------
# Celery / Redis
# ---------------------------------------------------------------------------
CELERY_BROKER_URL = config('CELERY_BROKER_URL', default='redis://localhost:6379/1')
CELERY_RESULT_BACKEND = config('CELERY_RESULT_BACKEND', default='redis://localhost:6379/2')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
CELERY_RESULT_EXTENDED = True
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_ACKS_LATE = True

# ---------------------------------------------------------------------------
# External Integrations
# ---------------------------------------------------------------------------
FAYDA_EKYC_BASE_URL = config('FAYDA_EKYC_BASE_URL', default='')
FAYDA_CLIENT_ID = config('FAYDA_CLIENT_ID', default='')
FAYDA_CLIENT_SECRET = config('FAYDA_CLIENT_SECRET', default='')

ETHSWITCH_API_BASE_URL = config('ETHSWITCH_API_BASE_URL', default='')
ETHSWITCH_API_KEY = config('ETHSWITCH_API_KEY', default='')
ETHSWITCH_HMAC_SECRET = config('ETHSWITCH_HMAC_SECRET', default='')

ETHIO_TELECOM_API_BASE_URL = config('ETHIO_TELECOM_API_BASE_URL', default='')
ETHIO_TELECOM_API_KEY = config('ETHIO_TELECOM_API_KEY', default='')
SAFARICOM_ET_API_BASE_URL = config('SAFARICOM_ET_API_BASE_URL', default='')
SAFARICOM_ET_API_KEY = config('SAFARICOM_ET_API_KEY', default='')

TELEGRAM_BOT_TOKEN = config('TELEGRAM_BOT_TOKEN', default='')
TELEGRAM_WEBHOOK_SECRET = config('TELEGRAM_WEBHOOK_SECRET', default='')

OCR_ENGINE = config('OCR_ENGINE', default='tesseract')
TESSERACT_CMD = config('TESSERACT_CMD', default='/usr/bin/tesseract')

SMS_GATEWAY_API_KEY = config('SMS_GATEWAY_API_KEY', default='')
SMS_GATEWAY_BASE_URL = config('SMS_GATEWAY_BASE_URL', default='')
SMS_GATEWAY_SENDER_ID = config('SMS_GATEWAY_SENDER_ID', default='NDSIR')

# ---------------------------------------------------------------------------
# Risk Scoring Engine Tunables (Module 2: Automated Scam Linkage Analysis)
# ---------------------------------------------------------------------------
RISK_SCORE_WEIGHTS = {
    'DUPLICATE_DESTINATION_ACCOUNT': 25,
    'DUPLICATE_SCAMMER_PHONE': 20,
    'HIGH_VALUE_TRANSACTION': 15,   # amount above threshold
    'MULTI_HOP_DEPTH': 10,          # per additional hop detected
    'UNVERIFIED_VICTIM_IDENTITY': -30,  # penalize/suspend scoring until eKYC passes
    'FLAGGED_EVIDENCE_AUTHENTICITY': -40,
}
RISK_SCORE_HIGH_VALUE_THRESHOLD_ETB = 50000
RISK_SCORE_AUTO_ESCALATE_THRESHOLD = 70

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{asctime}] {levelname} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {'class': 'logging.StreamHandler', 'formatter': 'verbose'},
    },
    'root': {'handlers': ['console'], 'level': 'INFO'},
    'loggers': {
        'django': {'handlers': ['console'], 'level': 'INFO', 'propagate': False},
        'ndsir': {'handlers': ['console'], 'level': 'DEBUG', 'propagate': False},
    },
}