"""
Celery application instance for asynchronous task processing:
OCR parsing, PDF export, SMS/Email alerts, and external partner
API calls (Module 1.4: Configure Celery and Redis).
"""
import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core_config.settings.production')

app = Celery('ndsir')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()


@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
