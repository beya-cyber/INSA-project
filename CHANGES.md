# NDSIR cross-portal rewrite — what changed

## New shared architecture
- `frontend/src/store/ndsirStore.js` — pure reducer + seed data for the whole command network (incidents, freeze orders, evidence, suspects, warrants, recovery ledger, nodes, WAF, users, audit chain). No React inside, so it is unit-testable.
- `frontend/src/context/NdsirContext.jsx` — React binding. State persists in `localStorage` and syncs across tabs; each action does read-latest → reduce → write synchronously (fixes a lost-update race between tabs).
- `frontend/src/lib/sha256.js` (sync SHA-256 + HMAC, verified against Node crypto), `format.js`, `pdfLite.js` (dependency-free PDF writer).
- `frontend/src/components/portal/ui.jsx` — shared dark-mode design system lifted from AnalystDashboard.
- `frontend/src/routes/RequireRole.jsx` — per-role gate; sessions live in `sessionStorage` (one login per tab); Global Security Reset invalidates all other sessions.

## Closed loops implemented
- Analyst dispatch -> Bank Priority Freeze Queue (`PENDING_EXECUTION`, holder, account, ETB).
- Bank PIN execute -> `CBE-SEC-XXXXXX` ref + ACK -> signed, hash-chained Auditor entries -> SLA scorecards -> Recovery Ledger.
- Analyst / Bank / Police events -> Admin telemetry; 3 failed PINs raise a WAF brute-force flag.
- Verified dossier -> Police Evidence Locker + Suspect Telemetry (IPDR / IMEI / cell towers).
- Police warrant: draft -> magistrate PIN (HMAC signature) -> serve -> live Bank order -> auto-archived on execution.
- Admin kill switch really blocks dispatch (Analyst), execution (Bank) and warrant service (Police).

## Fixed
- `App.jsx`: Auditor page was never imported/routed (login pointed at `/partner-dashboard`, which rendered the wrong page); Police route rendered a partners page instead of `PoliceDashboard`; no persistent navbar/role gating.
- Removed duplicates/dead files: `frontend/frontend/` (nested copy), root-level `frontend/components/`, `src/pages/StaffLogin.jsx`, `src/pages/auth/StaffLogin.jsx`, `src/pages/staff/AdminDashboard.jsx`, `src/components/layout/ConsoleNavbar.jsx`, `src/components/CommandHeader.jsx`, `src/routes/AppRoutes.jsx`, `src/context/LanguageContext.jsx` (the app uses `i18n/LanguageContext`), and the superseded `pages/partners/{Partner,PolicePortal,BankPortal}Dashboard.jsx`.
- Broken buttons / missing keys / local-only state in all five dashboards replaced by store-backed handlers.

## Demo-grade caveats (important)
- PINs (analyst 1234, bank 4321, police 7777), the HMAC key and the hash chain are all in the browser. A production system must verify PINs and sign/append the ledger server-side (Django `apps/audit_logs`, KMS/HSM key).
- Staff login accepts any credentials (as in the original template).
- Telemetry (IPDR, IMEI, towers, WAF noise) is simulated.

## Not verified here
I had no network, so I could not run `npm install` / `vite build`. I compiled the whole app with esbuild and ran the five portals in headless Chromium with stand-ins for `react-router-dom` and `lucide-react`. Run `npm install && npm run dev` once on your side to confirm; the public citizen pages were not exercised.
