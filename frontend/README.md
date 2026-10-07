# NDSIR Frontend — INSA National Digital Scam Incident Response System

React + Vite + Tailwind CSS frontend for the National Digital Scam Incident Response
and Financial Fraud Report System.

## Design system
Two deliberate visual modes for two audiences:
- **Public citizen portal** — light, calm, single-column wizard (`public-*` CSS classes).
- **INSA operations console** — dark, dense, security-operations-center feel (`console-*` CSS classes).

Type: IBM Plex Sans (UI) + IBM Plex Mono (tracking codes, hashes, account numbers, timestamps).
Color tokens live in `tailwind.config.js` under `ink`, `mist`, `fog`, `signal`, `amber`, `critical`, `verified`.

## Quick start
```bash
npm install
cp .env.example .env
npm run dev
```
Runs at http://localhost:5173. API calls proxy to `VITE_API_PROXY_TARGET` (default `http://localhost:8000`).

## Demo mode (no backend required)
Every page falls back to realistic mock data if the Django API isn't reachable, so the
full UI can be explored standalone. Sign in at `/login` with any of:

| Username | Password | Role |
|---|---|---|
| analyst.demo | demo | INSA Forensic Analyst |
| supervisor.demo | demo | INSA Operations Supervisor |
| auditor.demo | demo | System & Compliance Auditor |
| admin.demo | demo | System Administrator |
| bank.demo | demo | Bank / Financial Institution Agent |
| police.demo | demo | Federal Police CIB Liaison |

## Build
```bash
npm run build   # outputs to dist/
npm run preview
```

## Docker
```bash
docker build -t ndsir-frontend .
docker run -p 8080:80 ndsir-frontend
```

## Structure
```
src/
  api/            Axios clients per backend app (auth, incidents, forensics, integrations, audit)
  context/        AuthContext (JWT + demo login), IntakeContext (citizen wizard state)
  routes/         AppRoutes, ProtectedRoute, RoleBasedRoute
  components/
    common/       Button, Modal, StatusBadge, RiskBadge, Spinner, EmptyState
    forms/        TextField, SelectField, Dropzone, StepProgress
    layout/       PublicLayout, ConsoleLayout, Sidebar, TopBar
    visualizers/  LinkageGraph (D3 force-directed scam network)
  pages/
    public/       LandingPage, CitizenIntakeWizard, CaseTrackerPage, LoginPage
    analyst/      DashboardTriage, EvidenceDetailVisualizer, ScamLinkageGraphPage,
                  AnalyticsOverview, LegalExportWorkspace
    auditor/      ActionAuditLogsPage
    partners/     BankHoldOrdersPage, PoliceWarrantPackagesPage
    admin/        UserManagementPage
```
