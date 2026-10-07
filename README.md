# National Digital Scam Incident Response and Financial Fraud Report System (NDSIR)

Backend implementation for INSA (Information Network Security Administration), Ethiopia.

## Stack
- **Backend:** Django 5 + Django REST Framework, PostgreSQL, Celery + Redis
- **Auth:** JWT (SimpleJWT) with granular RBAC (7 roles) + TOTP MFA for privileged actions
- **Integrations:** Fayda National Digital ID (eKYC), EthSwitch/Bank freeze orders, Ethio Telecom & Safaricom SIM/IMEI suspension, SMS gateway for citizen notifications, Telegram Bot + IVR intake
- **Forensics:** OCR metadata extraction (Tesseract/EasyOCR), image authenticity heuristics (ELA), NetworkX-based scam linkage graph, automated risk scoring
- **Legal:** Court-ready, hash-sealed PDF export pipeline for Federal Police CIB
- **Localization:** Citizen-facing surfaces (landing page, report wizard, case tracker) are bilingual English/Amharic, with Ge'ez-script font support
- **Security:** CSP + hardening headers middleware, immutable audit ledger, MFA-gated privileged actions, CSRF-trusted-origins config for HTTPS deployment
- **Reliability:** React error boundary (no white-screen crashes on the citizen-facing app), non-blocking error/toast UI throughout (no native `alert()`/`confirm()` anywhere)

## Quick Start (Docker)
```bash
cp backend/.env.example backend/.env    # fill in real secrets/API keys
docker compose up --build
```
- API: http://localhost/api/v1/
- Swagger docs: http://localhost/api/docs/
- Django admin: http://localhost/admin/
- Health check: http://localhost/healthz/

The `backend` service's startup command runs `makemigrations` before `migrate`,
because this repository ships without pre-generated migration files (they were
authored without a live Django install to generate them against). **For a real
production deployment, run `makemigrations` once yourself, commit the resulting
files under `apps/*/migrations/`, and then change the compose command back to
just `migrate --noinput`** — regenerating migrations at every container boot is
a reasonable way to get this running today, not a practice to keep long-term.

## Local Development (without Docker)
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # edit DJANGO_SETTINGS_MODULE=core_config.settings.local, and DB creds
python manage.py makemigrations accounts incidents forensics integrations audit_logs
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```
Run Celery in separate terminals:
```bash
celery -A core_config worker --loglevel=info
celery -A core_config beat --loglevel=info
```

## Running Tests
```bash
cd backend
pytest
```

## Seeding Demo Data
```bash
python manage.py seed_demo_data          # add demo accounts + sample cases
python manage.py seed_demo_data --flush  # wipe and reseed
```
Creates six staff/partner accounts matching the frontend's demo usernames
(`analyst.demo`, `supervisor.demo`, `auditor.demo`, `admin.demo`, `bank.demo`,
`police.demo`), password `NdsirDemo!2026`, plus realistic incident reports,
a linked-case pair (shared destination account), a transaction hop, and a
freeze order - enough to exercise every screen without manual data entry.
Development/staging only; never run automatically in production.

## RBAC Roles
Citizen, INSA Forensic Analyst, INSA Operations Supervisor, System & Compliance Auditor,
System Administrator, Bank/Financial Institution Agent, Federal Police CIB Liaison.
See `apps/accounts/permissions.py` for enforcement and the original RBAC matrix document
for the full capability table.

## Security Notes
- All privileged actions (freeze approval, SIM/IMEI suspension, legal export approval)
  require Supervisor role **and** confirmed MFA (`RequiresMFA` permission).
- Fayda ID numbers are never stored - only a salted SHA-256 hash (`fayda_id_hash`).
- `ActionAuditLog` is append-only at the model layer (`save()`/`delete()` raise on mutation).
- Bank/telecom webhook callbacks are HMAC-verified before being trusted.
- A restrictive Content-Security-Policy and additional hardening headers are applied to
  every response (`core_config/middleware.py`); `CSRF_TRUSTED_ORIGINS` must be set to your
  real HTTPS domain(s) in production - see `.env.example`.

## Citizen Data Consent
Every web-portal submission requires an explicit consent checkbox (bilingual, English/
Amharic) before it can be submitted. The backend enforces this server-side too
(`IncidentReport.consent_given`, validated in `CitizenIncidentSubmissionSerializer`) -
the frontend check is a UX convenience, not the actual guarantee. `consent_recorded_at`
timestamps when consent was given, for audit purposes.

## Localization
The citizen-facing surfaces (landing page, 4-step report wizard, case tracker, evidence
dropzone) are fully bilingual - see `frontend/src/i18n/`. A language switcher (EN / አማ)
lives in the public header and persists the person's choice across visits. Status badges
on the case tracker also switch language. The INSA analyst console, admin, and partner
screens remain English-only by design (operated by trained staff under one shared
operational language) - extending the same `useLanguage()`/`t()` pattern there is
straightforward if bilingual staff operation is ever required.

## Known Scope Gaps
Being direct about what this codebase does *not* yet cover, so nothing here is mistaken
for a finished audit:
- **Migrations are generated at container boot, not committed to the repo** (see the
  `docker-compose.yml` comment on this). Fine for getting this running today; a real
  deployment should generate them once, commit them, and drop the `makemigrations` step.
- **No automated CI pipeline** (lint/test on push) is included.
- **SMS gateway integration is a real, working client (`apps/integrations/sms_gateway.py`)
  but has no real provider credentials wired up** - it logs the intended message instead
  of sending when unconfigured, by design, so notification failures never block a report.

## Account Security
- **Lockout**: accounts lock for `ACCOUNT_LOCKOUT_MINUTES` (default 15) after
  `ACCOUNT_LOCKOUT_THRESHOLD` (default 5) consecutive failed logins, on top of the
  existing IP-based rate limiting - this closes a real gap where the `User` model already
  had `failed_login_attempts`/`locked_until` fields but nothing ever wrote to them.
- **Suspension takes effect at login**, not just inside individual RBAC permission checks -
  a suspended account can no longer obtain a token at all.
- **Self-service password reset** for staff/partner accounts at `/reset-password` (frontend)
  and `/api/v1/auth/password-reset/{request,confirm}/` (backend). Token-based, 30-minute
  expiry, single-use, and the request endpoint always returns the same generic response
  regardless of whether the identifier matched a real account (no user enumeration).
  Citizens don't use this - the report/track flow never requires a password.

## Case Status Notifications
Beyond the initial submission confirmation, victims now receive an SMS when their case is
auto-escalated (`ESCALATED`) or when a freeze order they're the subject of is actually
acknowledged as executed (`FROZEN`) - previously `FROZEN` was never set by any real code
path at all, only faked in seed data; approving and acknowledging a freeze order updated
the order's own status but never the underlying case, so a victim could never actually see
"Frozen" on their tracked case even after their money genuinely had been frozen. Fixed in
`apps/integrations/views.py::_mark_report_frozen`.
# Insa-project-
