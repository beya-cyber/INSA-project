"""
Request-level audit middleware - records every authenticated API call's
method, path, status code, and latency for security review purposes.
Runs independently of the business-action ActionAuditLog.
"""
import time
import logging

logger = logging.getLogger('ndsir')


class RequestAuditMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start = time.monotonic()
        response = self.get_response(request)
        duration_ms = int((time.monotonic() - start) * 1000)

        # Only log API traffic; skip static/media/admin-asset noise.
        if request.path.startswith('/api/'):
            self._record(request, response, duration_ms)

        return response

    def _record(self, request, response, duration_ms):
        try:
            from .models import RequestAuditEntry
            user = getattr(request, 'user', None)
            RequestAuditEntry.objects.create(
                actor=user if (user and user.is_authenticated) else None,
                method=request.method,
                path=request.path[:500],
                status_code=response.status_code,
                ip_address=self._client_ip(request),
                response_time_ms=duration_ms,
            )
        except Exception as exc:  # noqa: BLE001
            # Audit logging must never break the request/response cycle.
            logger.warning("RequestAuditMiddleware failed to persist entry: %s", exc)

    def _client_ip(self, request):
        forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
        return forwarded.split(',')[0].strip() if forwarded else request.META.get('REMOTE_ADDR', '0.0.0.0')
