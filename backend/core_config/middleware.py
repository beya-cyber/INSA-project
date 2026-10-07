"""
Additional security response headers, layered on top of Django's own
SecurityMiddleware (which already handles HSTS, X-Frame-Options, and
content-type sniffing protection via settings). This middleware adds
what Django doesn't set out of the box: a restrictive Content-Security-
Policy and a couple of modern browser hardening headers, without
requiring an extra third-party package.
"""


class SecurityHeadersMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Restrictive by default: this is a JSON API plus a Django admin
        # panel, not a page that needs to load third-party scripts or
        # styles. Adjust if the admin's static assets ever need a CDN.
        response.setdefault('Content-Security-Policy', (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data:; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self';"
        ))
        response.setdefault('X-Content-Type-Options', 'nosniff')
        response.setdefault('Referrer-Policy', 'same-origin')
        response.setdefault('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
        response.setdefault('X-Permitted-Cross-Domain-Policies', 'none')

        return response
