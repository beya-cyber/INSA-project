"""
WSGI config for core_config project.
"""
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core_config.settings.production')
application = get_wsgi_application()
