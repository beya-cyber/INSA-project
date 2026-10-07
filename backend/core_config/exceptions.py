"""
Custom exception handler ensuring the API never leaks internal stack traces
or database errors to citizens/external partners, while still logging
full detail server-side for INSA engineering review.
"""
import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger('ndsir')


def ndsir_exception_handler(exc, context):
    response = exception_handler(exc, context)

    request = context.get('request')
    view = context.get('view')

    if response is not None:
        logger.warning(
            "Handled exception in %s: %s | user=%s",
            getattr(view, '__class__', view),
            exc,
            getattr(getattr(request, 'user', None), 'id', 'anonymous'),
        )
        response.data = {
            'success': False,
            'error': {
                'code': response.status_code,
                'detail': response.data,
            },
        }
        return response

    # Unhandled exception - never expose internals externally
    logger.error(
        "UNHANDLED exception in %s: %s | user=%s",
        getattr(view, '__class__', view),
        exc,
        getattr(getattr(request, 'user', None), 'id', 'anonymous'),
        exc_info=True,
    )
    return Response(
        {
            'success': False,
            'error': {
                'code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                'detail': 'An internal error occurred. This incident has been logged for review.',
            },
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
