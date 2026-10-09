"""
Prints the staff-portal demo PINs so testers can complete PIN-gated actions
(dispatch freeze, execute freeze, sign warrant).

    python manage.py show_demo_pins

Source of truth for the backend is settings.DEMO_PINS (base.py). The PIN check
itself still runs in the browser (frontend/src/store/ndsirStore.js `PINS`) -
if you change a PIN, change it in both places.

Refuses to run when DEBUG is off unless --force is given: fixed PINs must not be
advertised on a production host. In production, derive a per-user PIN with
HMAC-SHA256(server_key, user_id + role) and verify it server-side.
"""
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Print the demo PINs for the Analyst, Bank and Police portals (dev/demo only).'

    def add_arguments(self, parser):
        parser.add_argument('--force', action='store_true', help='Print even when DEBUG is False.')

    def handle(self, *args, **options):
        if not settings.DEBUG and not options['force']:
            raise CommandError('DEBUG is off - refusing to print demo PINs. Use --force if this is a demo server.')

        rows = [(v['label'], v['pin'], v['purpose']) for v in settings.DEMO_PINS.values()]
        headers = ('Role', 'PIN', 'Purpose')
        widths = [max(len(str(r[i])) for r in rows + [headers]) + 2 for i in range(3)]

        def line(left, mid, right):
            return left + mid.join('─' * w for w in widths) + right

        def row(cells):
            return '│' + '│'.join(f' {str(c):<{w - 1}}' for c, w in zip(cells, widths)) + '│'

        out = [line('┌', '┬', '┐'), row(headers), line('├', '┼', '┤')]
        out += [row(r) for r in rows]
        out.append(line('└', '┴', '┘'))
        self.stdout.write('\n'.join(out))
        self.stdout.write(self.style.WARNING('DEMO ONLY - the check runs in the browser (ndsirStore.js PINS). Keep both in sync.'))
