# Software Requirements Specification (SRS)
## NDSIR — National Digital Scam Incident Response Platform

**Version:** 2.0
**Date:** October 2026
**Organization:** INSA (Information Network Security Administration), Federal Democratic Republic of Ethiopia
**Status:** Active development, demo-ready pipeline
**Classification:** Internal — Restricted

---

## 1. INTRODUCTION

### 1.1 Purpose

This document specifies the functional and non-functional requirements for the **National Digital Scam Incident Response (NDSIR) Platform** — a closed-loop, multi-agency fraud interception system for Ethiopia's financial and telecom sectors.

Intended audience:
- INSA leadership — for approval and scope
- Engineering teams — for build reference
- Regulatory stakeholders — for compliance review
- Partner institutions — for integration planning

### 1.2 Scope

NDSIR unifies five operational pillars into one real-time command ecosystem:

1. **Fraud Analyst Hub** — incident triage, evidence verification, freeze dispatch
2. **Commercial Bank Portal** — dual-control asset freeze execution
3. **Law Enforcement Hub** — digital warrant issuance, evidence locker
4. **System Administrator Core** — cluster health, WAF, kill-switch
5. **Compliance Auditor Vault** — immutable audit trail, forensic reports

Plus a public citizen intake channel (web, Telegram, IVR).

**Out of scope for v1:** cross-border corridors, automated judicial subpoenas, ML-based anomaly detection (planned Phase 2/3).

### 1.3 Definitions & Acronyms

| Term | Meaning |
|---|---|
| NDSIR | National Digital Scam Incident Response |
| INSA | Information Network Security Administration |
| Fayda | Ethiopia's National Digital ID system |
| EthSwitch | Ethiopia's interbank payment switch |
| Telebirr | Ethio Telecom's mobile money platform |
| IPDR | IP Detail Record |
| IMEI | International Mobile Equipment Identity |
| SHA-256 | Cryptographic hash algorithm |
| HMAC | Hash-based Message Authentication Code |
| JWT | JSON Web Token |
| RBAC | Role-Based Access Control |
| SLA | Service Level Agreement |
| WAF | Web Application Firewall |
| eKYC | Electronic Know Your Customer |

### 1.4 References

- Proclamation No. 958/2016 — Computer Crime
- Proclamation No. 1185/2020 — Cybercrime
- National Bank of Ethiopia Directives on Mobile Money
- ISO/IEC 27001 — Information Security Management
- OWASP Top 10 (2021)
- NIST Cybersecurity Framework 2.0

---

## 2. OVERALL DESCRIPTION

### 2.1 Product Perspective

NDSIR is a greenfield national infrastructure platform. It replaces fragmented, manual, paper-driven fraud escalation with a unified digital command network. It integrates with:

- Banking core systems — CBE, Awash, Abyssinia, Dashen, etc.
- Mobile money platforms — Telebirr, M-PESA Ethiopia, CBE Birr
- Telecom operators — Ethio Telecom, Safaricom Ethiopia
- National ID system — Fayda eKYC
- Payment switch — EthSwitch
- Federal Police systems — warrant management, evidence lockers

### 2.2 Product Functions

| Function | Description |
|---|---|
| Real-time incident ingestion | Citizen, bank, telecom, police referrals flow into one queue |
| Multi-hop fraud tracing | Track stolen funds across banks and wallets |
| Automated asset freezing | Sub-minute freeze dispatch to banks |
| Dual-control execution | Two-person approval for every freeze |
| Evidence preservation | SHA-256 hashing, chain-of-custody, forensic reports |
| Judicial workflow | Digital warrant drafting, signature, service |
| Immutable audit | Append-only, HMAC-signed audit trail |
| Compliance reporting | Regulatory scorecards, PDF/CSV exports |
| Emergency controls | Admin kill-switch, node isolation, global reset |

### 2.3 User Classes & Characteristics

| User Class | Frequency | Skill Level | Volume |
|---|---|---|---|
| Citizen reporter | Rare | Low | High volume |
| Fraud analyst | Daily | High | Medium |
| Bank officer | Daily | Medium | Medium |
| Police investigator | Weekly | High | Low |
| Magistrate judge | Weekly | Medium | Low |
| System administrator | Daily | Very high | Very low |
| Compliance auditor | Weekly | High | Low |
| INSA supervisor | Weekly | High | Very low |

### 2.4 Operating Environment

**Backend:**
- Linux (Ubuntu 22.04 LTS or later)
- Python 3.12+
- PostgreSQL 15+ (production) / SQLite (dev)
- Redis 7+ (cache + Celery broker)
- Docker + docker-compose for orchestration
- Nginx reverse proxy

**Frontend:**
- Modern browsers (Chrome, Firefox, Safari, Edge — latest 2 versions)
- Node.js 20+ for build tooling
- React 18, Vite 5, Tailwind CSS 3

**Deployment:**
- On-premise (sovereign data center), OR
- Sovereign cloud (Ethiopian-hosted)

### 2.5 Design & Implementation Constraints

- Data residency: All PII must remain on Ethiopian soil
- Language: Bilingual (Amharic + English) for citizen-facing UI
- Calendar: Ethiopian calendar support required
- Currency: ETB, formatted per Ethiopian convention
- Network: Must operate over unreliable connections (offline-tolerant sync)
- Compliance: Must satisfy NBE, INSA, and Federal Court evidentiary standards

### 2.6 Assumptions & Dependencies

- Fayda eKYC API is available and stable
- EthSwitch provides real-time freeze gateway
- Partner banks expose core banking APIs
- Federal Court accepts digital signatures on warrants
- National data center provides ≥99.9% uptime

---

## 3. FUNCTIONAL REQUIREMENTS

### 3.1 Authentication & Authorization

| ID | Requirement | Priority |
|---|---|---|
| FR-AUTH-01 | Users authenticate via username + password | Must |
| FR-AUTH-02 | System issues JWT access tokens (15 min TTL) | Must |
| FR-AUTH-03 | Refresh tokens (1 day TTL) with rotation + blacklist | Must |
| FR-AUTH-04 | RBAC with 5 roles: Analyst, Bank, Police, Admin, Auditor | Must |
| FR-AUTH-05 | Account lockout after 5 failed attempts in 15 min | Must |
| FR-AUTH-06 | MFA (TOTP) for elevated roles (Admin, Police) | Should |
| FR-AUTH-07 | Logout clears all tokens and session storage | Must |
| FR-AUTH-08 | Session timeout after 30 min inactivity | Must |

### 3.2 Citizen Intake (Public)

| ID | Requirement | Priority |
|---|---|---|
| FR-CIT-01 | Multi-step wizard: Identify → Details → Bank info → Confirm | Must |
| FR-CIT-02 | Multi-ID support: Fayda, Kebele ID, Passport | Must |
| FR-CIT-03 | Phone OTP verification (6-digit, 5-min TTL) | Must |
| FR-CIT-04 | HMAC-signed verification tokens (single-use, 15-min TTL) | Must |
| FR-CIT-05 | Rate limit: 3 OTP requests per phone per 15 min | Must |
| FR-CIT-06 | Evidence upload (audio, image, PDF, max 10 MB each) | Must |
| FR-CIT-07 | SHA-256 hashing on upload | Must |
| FR-CIT-08 | Return tracking code to citizen | Must |
| FR-CIT-09 | Public case tracker (status only, no PII) | Must |
| FR-CIT-10 | Bilingual UI (Amharic + English) | Should |
| FR-CIT-11 | Telegram bot intake | Should |
| FR-CIT-12 | IVR phone hotline intake (via 933) | Should |
| FR-CIT-13 | Data minimization: store ID hash, not raw ID | Must |

### 3.3 Fraud Analyst Hub

| ID | Requirement | Priority |
|---|---|---|
| FR-ANL-01 | View all incoming reports in one queue | Must |
| FR-ANL-02 | Filter by status, type, bank, risk score | Must |
| FR-ANL-03 | Search by tracking code, phone, account | Must |
| FR-ANL-04 | View report details + evidence preview | Must |
| FR-ANL-05 | Verify SHA-256 hash of each evidence file | Must |
| FR-ANL-06 | Validate dossier → escalate to freeze queue | Must |
| FR-ANL-07 | Trigger freeze dispatch with PIN (4-digit) | Must |
| FR-ANL-08 | 24-hour freeze velocity tracking | Should |
| FR-ANL-09 | Cross-bank mule detection hints | Should |
| FR-ANL-10 | Add notes / comments to case | Must |
| FR-ANL-11 | Bulk actions (multi-select) | Should |

### 3.4 Commercial Bank Portal

| ID | Requirement | Priority |
|---|---|---|
| FR-BNK-01 | View priority freeze queue (filtered by bank) | Must |
| FR-BNK-02 | Execute freeze with dual-control PIN | Must |
| FR-BNK-03 | Generate secure gateway reference (e.g., CBE-SEC-XXXXXX) | Must |
| FR-BNK-04 | Send automated ACK to command network | Must |
| FR-BNK-05 | Restore account (false positive flow) | Must |
| FR-BNK-06 | SLA timer per order (120s target) | Must |
| FR-BNK-07 | View account transaction history (read-only) | Should |
| FR-BNK-08 | Bulk freeze via CSV import | Could |

### 3.5 Law Enforcement / Police Hub

| ID | Requirement | Priority |
|---|---|---|
| FR-POL-01 | Draft electronic search warrant | Must |
| FR-POL-02 | Cryptographic signature on warrant | Must |
| FR-POL-03 | Serve warrant to bank/telecom | Must |
| FR-POL-04 | Pull IPDR telemetry for suspect phone | Should |
| FR-POL-05 | Pull IMEI / cell tower history | Should |
| FR-POL-06 | Digital evidence locker with chain-of-custody | Must |
| FR-POL-07 | Dispatch task force to suspect location | Should |
| FR-POL-08 | Track suspect status (at large / detained) | Should |
| FR-POL-09 | Warrant signing requires PIN | Must |

### 3.6 System Administrator Core

| ID | Requirement | Priority |
|---|---|---|
| FR-ADM-01 | View cluster node status (uptime, latency) | Must |
| FR-ADM-02 | View WAF injection attempts | Must |
| FR-ADM-03 | View failed login attempts | Must |
| FR-ADM-04 | User provisioning, role assignment, suspension | Must |
| FR-ADM-05 | Node isolation (kill-switch) with reason | Must |
| FR-ADM-06 | Global security reset | Should |
| FR-ADM-07 | IP blocklist management | Should |
| FR-ADM-08 | System event log viewer | Must |

### 3.7 Compliance Auditor Vault

| ID | Requirement | Priority |
|---|---|---|
| FR-AUD-01 | View append-only audit trail | Must |
| FR-AUD-02 | Verify audit chain integrity (hash chain) | Must |
| FR-AUD-03 | Search audit log by user/action/date | Must |
| FR-AUD-04 | Regulatory scorecards per bank | Should |
| FR-AUD-05 | SLA compliance metrics | Should |
| FR-AUD-06 | Export PDF forensic report (signed) | Must |
| FR-AUD-07 | Export CSV audit extract | Must |
| FR-AUD-08 | Read-only access (cannot modify data) | Must |

### 3.8 Audit & Evidence

| ID | Requirement | Priority |
|---|---|---|
| FR-EVD-01 | Every action logged with timestamp, user, action, target | Must |
| FR-EVD-02 | Audit log is append-only (no edits, no deletes) | Must |
| FR-EVD-03 | Each entry signed with HMAC | Must |
| FR-EVD-04 | Hash chain links each entry to previous | Must |
| FR-EVD-05 | Evidence files SHA-256 hashed on ingest | Must |
| FR-EVD-06 | Chain-of-custody updated on every access | Must |
| FR-EVD-07 | Forensic report includes all case evidence | Must |
| FR-EVD-08 | Report cryptographically signed | Must |

---

## 4. NON-FUNCTIONAL REQUIREMENTS

### 4.1 Performance

| ID | Requirement | Target |
|---|---|---|
| NFR-PERF-01 | API response time (p95) | < 500 ms |
| NFR-PERF-02 | Freeze dispatch latency | < 200 ms |
| NFR-PERF-03 | WebSocket event propagation | < 100 ms |
| NFR-PERF-04 | Concurrent users supported | ≥ 1,000 |
| NFR-PERF-05 | Concurrent freezes during attack | ≥ 500/sec |
| NFR-PERF-06 | DB query time (p95) | < 100 ms |
| NFR-PERF-07 | Frontend First Contentful Paint | < 1.5 s |

### 4.2 Security

| ID | Requirement |
|---|---|
| NFR-SEC-01 | All traffic over HTTPS (TLS 1.2+) |
| NFR-SEC-02 | Passwords hashed with Argon2 or bcrypt |
| NFR-SEC-03 | PII encrypted at rest (AES-256) |
| NFR-SEC-04 | PII masked in logs |
| NFR-SEC-05 | Secrets managed via Vault / KMS in production |
| NFR-SEC-06 | CSRF protection on all state-changing endpoints |
| NFR-SEC-07 | SQL injection prevention via ORM |
| NFR-SEC-08 | XSS prevention via React escaping |
| NFR-SEC-09 | Rate limiting on all public endpoints |
| NFR-SEC-10 | Content Security Policy headers |
| NFR-SEC-11 | HSTS enabled |
| NFR-SEC-12 | No secrets in frontend bundle |

### 4.3 Reliability & Availability

| ID | Requirement | Target |
|---|---|---|
| NFR-REL-01 | System uptime | ≥ 99.9% |
| NFR-REL-02 | Disaster recovery RTO | < 4 hours |
| NFR-REL-03 | Disaster recovery RPO | < 15 min |
| NFR-REL-04 | Graceful degradation on external service failure | Required |
| NFR-REL-05 | Automatic failover between data centers | Required |
| NFR-REL-06 | Zero-downtime deployments | Required |

### 4.4 Scalability

| ID | Requirement |
|---|---|
| NFR-SCL-01 | Horizontal scaling of API tier |
| NFR-SCL-02 | Read replicas for analytics queries |
| NFR-SCL-03 | Async task processing via Celery |
| NFR-SCL-04 | Support 27+ financial institutions |

### 4.5 Usability

| ID | Requirement |
|---|---|
| NFR-USE-01 | WCAG 2.1 AA accessibility |
| NFR-USE-02 | Bilingual (Amharic + English) |
| NFR-USE-03 | Mobile-responsive (≥ 375px) |
| NFR-USE-04 | Keyboard-navigable |
| NFR-USE-05 | Loading / error / empty states for every view |

### 4.6 Maintainability

| ID | Requirement |
|---|---|
| NFR-MNT-01 | Automated test coverage ≥ 70% |
| NFR-MNT-02 | Structured logging (JSON) |
| NFR-MNT-03 | Centralized monitoring (Sentry, Prometheus) |
| NFR-MNT-04 | API versioning (URL prefix) |
| NFR-MNT-05 | API schema published (OpenAPI) |

### 4.7 Compliance & Legal

| ID | Requirement |
|---|---|
| NFR-CMP-01 | Ethiopian data residency |
| NFR-CMP-02 | NBE directive adherence |
| NFR-CMP-03 | Federal Court evidence admissibility |
| NFR-CMP-04 | ISO 27001 alignment |
| NFR-CMP-05 | GDPR-equivalent privacy by design |

---

## 5. SYSTEM ARCHITECTURE

### 5.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  CITIZEN CHANNELS                                           │
│  Web Portal │ Telegram Bot │ IVR Hotline (933) │ SMS        │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│  API GATEWAY (Nginx + Django + DRF)                         │
│  ├── Public endpoints (no auth)                             │
│  ├── Staff endpoints (JWT auth)                             │
│  └── Webhooks (Telegram, IVR, banks)                        │
└──────┬────────────────────────────────┬─────────────────────┘
       │                                │
┌──────▼──────────┐         ┌───────────▼──────────┐
│  COMMAND STORE  │         │   ASYNC WORKERS      │
│  (PostgreSQL)   │         │   (Celery + Redis)   │
│  ├── Incidents  │         │   ├── OCR pipeline   │
│  ├── Audit log  │         │   ├── Linkage engine │
│  └── Evidence   │         │   ├── Notifications  │
└──────┬──────────┘         │   └── SLA monitor    │
       │                    └──────────────────────┘
       │
┌──────▼──────────────────────────────────────────────────────┐
│  PORTALS (React SPA)                                        │
│  ├── Analyst Hub      ├── Bank Portal    ├── Admin Core     │
│  ├── Police Hub       └── Auditor Vault                     │
└─────────────────────────────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────────────────────────┐
│  EXTERNAL INTEGRATIONS                                      │
│  ├── Bank core APIs (CBE, Awash, Abyssinia, ...)            │
│  ├── EthSwitch payment gateway                              │
│  ├── Telebirr P2P switch                                    │
│  ├── Fayda eKYC                                             │
│  ├── Ethio Telecom / Safaricom (IPDR, IMEI)                 │
│  └── SMS gateway                                            │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, Tailwind, React Router 6, Axios |
| Backend | Django 5, Django REST Framework, Celery |
| Database | PostgreSQL 15 (prod) / SQLite (dev) |
| Cache/Broker | Redis 7 |
| Auth | JWT (djangorestframework-simplejwt) with rotation + blacklist |
| API Docs | drf-spectacular (OpenAPI 3) |
| Reverse Proxy | Nginx |
| Container | Docker + docker-compose |
| Monitoring | Sentry, structured logs |

### 5.3 Data Model (Core Entities)

**Accounts:**
- User (custom) — role, tier, organization_code, is_mfa_enabled
- Role — INSA_ANALYST, INSA_SUPERVISOR, BANK_AGENT, POLICE_LIAISON, AUDITOR, ADMIN

**Incidents:**
- VictimProfile — full_name, phone_number, fayda_id_hash
- IncidentReport — tracking_code, victim, channel, incident_type, description, scammer_*, risk_score, status
- EvidenceFile — report, file, file_hash_sha256, ocr_parsed_json, authenticity_flag

**Integrations:**
- FreezeOrder — order_id, incident, bank, account, amount, status, gateway_ref
- TelecomOrder — suspect phone, action (block/trace), status
- WarrantOrder — target, legal_ref, signature, status

**Audit:**
- AuditLog — seq, timestamp, actor, role, action, details, prev_hash, hash, sig

---

## 6. DATA REQUIREMENTS

### 6.1 Data Retention

| Data Type | Retention Period |
|---|---|
| Active incident reports | 7 years |
| Frozen order records | 7 years |
| Audit logs | 10 years (immutable) |
| Evidence files | 7 years after case closure |
| Victim PII | 3 years post-closure (then anonymized) |
| Session logs | 90 days |

### 6.2 Data Classification

| Classification | Examples | Handling |
|---|---|---|
| Public | Hotline number, portal URL | No restriction |
| Internal | Metrics, non-PII stats | Staff-only |
| Confidential | Incident details, case notes | Role-scoped |
| Restricted | PII, evidence, warrants | Encrypted, audit-logged |

### 6.3 Data Residency

All data stays in Ethiopia:
- Primary data center: Addis Ababa
- Backup: Bahir Dar or Hawassa
- No cross-border transfer without explicit court order

---

## 7. INTERFACE REQUIREMENTS

### 7.1 User Interfaces

| Interface | Users | Primary Input |
|---|---|---|
| Citizen wizard | Public | Mouse + touch |
| Analyst dashboard | Analysts | Mouse + keyboard |
| Bank portal | Bank officers | Mouse + keyboard |
| Police hub | Investigators | Mouse + keyboard |
| Admin console | Sysadmins | Keyboard-heavy |
| Auditor vault | Auditors | Mouse + keyboard |

### 7.2 Hardware Interfaces

- HSM (Hardware Security Module) for signing keys — production
- NIDA card reader for in-person KYC — optional

### 7.3 Software Interfaces

| External System | Purpose | Protocol |
|---|---|---|
| Fayda eKYC API | Citizen identity verification | REST + OAuth2 |
| EthSwitch API | Interbank freeze execution | REST + HMAC |
| Telebirr API | Mobile money freeze | REST |
| Bank core APIs | Account operations | REST / ISO 8583 |
| Ethio Telecom | IPDR / IMEI lookup | REST + lawful intercept |
| SMS gateway | OTP delivery | REST |
| Telegram Bot API | Citizen intake | Webhook |

### 7.4 Communication Interfaces

- HTTPS (TLS 1.2+) for all external traffic
- WebSocket for real-time dashboard updates
- Redis for internal pub/sub
- Celery for task queue

---

## 8. SECURITY REQUIREMENTS

### 8.1 Threat Model (STRIDE)

| Threat | Mitigation |
|---|---|
| Spoofing | JWT + MFA for high-privilege roles |
| Tampering | HMAC-signed audit chain, SHA-256 evidence |
| Repudiation | Immutable audit log with non-repudiation |
| Information disclosure | RBAC, encryption at rest + transit |
| Denial of service | Rate limiting, WAF, DDoS protection |
| Elevation of privilege | Strict RBAC, dual-control for critical actions |

### 8.2 Insider Threat Mitigation

- Every action logged with user identity
- Dual-control for freezes and warrant signing
- Auditor role is read-only
- Admin actions logged separately
- Anomaly detection on unusual patterns (Phase 2)

### 8.3 Cryptographic Standards

| Use | Algorithm |
|---|---|
| Password hashing | Argon2 or bcrypt (cost ≥ 12) |
| Evidence integrity | SHA-256 |
| Audit signatures | HMAC-SHA256 |
| JWT signatures | HS256 (dev) / RS256 (prod) |
| Transport | TLS 1.2+ with strong ciphers |
| At-rest encryption | AES-256 |

---

## 9. PHASED ROADMAP

### Phase 1 — MVP (Months 1-3) ✅ Current
- Citizen intake (web)
- Analyst triage
- Bank freeze execution
- Audit chain
- 5-role RBAC

### Phase 2 — Enhanced (Months 4-9)
- ML-based anomaly detection
- Telegram + IVR intake
- Automated cross-bank mule detection
- Predictive risk scoring
- Mobile app for citizens

### Phase 3 — National Scale (Months 10-18)
- Full integration with 27+ banks
- Cross-border corridor (Kenya, Djibouti, Sudan)
- Automated judicial subpoena pipeline
- Real-time fraud graph visualization
- Public API for partner institutions

---

## 10. ACCEPTANCE CRITERIA

MVP is considered complete when:

- [ ] Citizen can submit a report via web and receive a tracking code
- [ ] Analyst can view, verify, and escalate a report within 60 seconds
- [ ] Analyst can dispatch a freeze to any partner bank
- [ ] Bank officer can execute freeze with dual-control PIN
- [ ] Every action appears in the immutable audit log
- [ ] Auditor can export a signed PDF forensic report
- [ ] Admin can isolate a node and see live status
- [ ] Police can draft and sign a warrant
- [ ] 6 demo accounts authenticate successfully
- [ ] All backend tests pass (unit + integration)
- [ ] Frontend builds cleanly, no console errors
- [ ] End-to-end pipeline: citizen → analyst → bank → police tested

---

## 11. APPENDICES

### Appendix A — Demo Credentials

| Role | Username | Password | PIN |
|---|---|---|---|
| Analyst | analyst.demo | NdsirDemo!2026 | 1234 |
| Bank | bank.demo | NdsirDemo!2026 | 4321 |
| Police | police.demo | NdsirDemo!2026 | 7777 |
| Admin | admin.demo | NdsirDemo!2026 | — |
| Auditor | auditor.demo | NdsirDemo!2026 | — |
| Supervisor | supervisor.demo | NdsirDemo!2026 | — |

### Appendix B — Key Endpoints

```
POST   /api/v1/incidents/otp/request/       Request OTP
POST   /api/v1/incidents/otp/verify/        Verify OTP → token
POST   /api/v1/incidents/submit/            Submit incident report
POST   /api/v1/incidents/evidence/upload/   Upload evidence
GET    /api/v1/incidents/track/<code>/      Public tracking
GET    /api/v1/incidents/reports/           List reports (analyst)
GET    /api/v1/incidents/reports/<id>/      Report detail
POST   /api/v1/auth/login/                  Staff login
POST   /api/v1/auth/token/refresh/          Refresh JWT
GET    /api/v1/auth/me/                     Current user
```

### Appendix C — Glossary

- ACID — Atomicity, Consistency, Isolation, Durability
- CORS — Cross-Origin Resource Sharing
- CSRF — Cross-Site Request Forgery
- ETB — Ethiopian Birr
- HSM — Hardware Security Module
- KYC — Know Your Customer
- SLA — Service Level Agreement
- TOTP — Time-based One-Time Password

### Appendix D — Version History

| Version | Date | Changes |
|---|---|---|
| 1.0 | Sept 2026 | Initial draft |
| 2.0 | Oct 9, 2026 | Post-patch: real OTP, HMAC tokens, RBAC expansion, sync pipeline verified, legacy folders removed |

---

**End of Document**

**Next review date:** December 2026
**Document owner:** INSA Cybercrime Division
**Classification:** Internal — Restricted