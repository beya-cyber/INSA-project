"""
ASGI config for core_config project.
"""
import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core_config.settings.production')
application = get_asgi_application()
