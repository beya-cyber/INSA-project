export const MOCK_REPORTS = [
  {
    id: '1', tracking_code: 'NDSIR-2026-7F3K9Q', victim_name: 'Selamawit Tesfaye',
    channel: 'WEB', incident_type: 'MOBILE_BANKING_FRAUD', risk_score: 82, status: 'ESCALATED',
    assigned_analyst: null, created_at: '2026-09-10T08:12:00Z', updated_at: '2026-09-14T10:03:00Z',
  },
  {
    id: '2', tracking_code: 'NDSIR-2026-A2B7XP', victim_name: 'Dawit Alemu',
    channel: 'TELEGRAM', incident_type: 'PHISHING', risk_score: 45, status: 'IN_REVIEW',
    assigned_analyst: 'analyst.demo', created_at: '2026-09-12T14:32:00Z', updated_at: '2026-09-13T09:15:00Z',
  },
  {
    id: '3', tracking_code: 'NDSIR-2026-K9M3ZT', victim_name: 'Rahel Girma',
    channel: 'IVR', incident_type: 'VOICE_SCAM', risk_score: 91, status: 'FROZEN',
    assigned_analyst: 'supervisor.demo', created_at: '2026-09-08T11:00:00Z', updated_at: '2026-09-14T07:40:00Z',
  },
  {
    id: '4', tracking_code: 'NDSIR-2026-Q4L1WD', victim_name: 'Mekdes Bekele',
    channel: 'WEB', incident_type: 'SIM_SWAP', risk_score: 24, status: 'PENDING',
    assigned_analyst: null, created_at: '2026-09-14T06:20:00Z', updated_at: '2026-09-14T06:20:00Z',
  },
  {
    id: '5', tracking_code: 'NDSIR-2026-V8N2RC', victim_name: 'Yonas Kebede',
    channel: 'TELEGRAM', incident_type: 'SMS_IMPERSONATION', risk_score: 58, status: 'IN_REVIEW',
    assigned_analyst: 'analyst.demo', created_at: '2026-09-11T16:45:00Z', updated_at: '2026-09-13T12:00:00Z',
  },
  {
    id: '6', tracking_code: 'NDSIR-2026-J5H8YB', victim_name: 'Hanna Solomon',
    channel: 'WEB', incident_type: 'MOBILE_BANKING_FRAUD', risk_score: 12, status: 'CLOSED',
    assigned_analyst: 'analyst.demo', created_at: '2026-09-02T09:00:00Z', updated_at: '2026-09-06T09:00:00Z',
  },
]

export const MOCK_ANALYTICS = {
  totalLosses: 4820000,
  avgResponseHours: 6.4,
  casesThisMonth: 312,
  frozenAccounts: 47,
  lossByInstitution: [
    { name: 'Telebirr', value: 1820000 },
    { name: 'CBE Birr', value: 1450000 },
    { name: 'Awash Birr', value: 890000 },
    { name: 'Other', value: 660000 },
  ],
  casesByType: [
    { name: 'Mobile Banking Fraud', value: 128 },
    { name: 'Phishing', value: 94 },
    { name: 'Voice Scam', value: 61 },
    { name: 'SIM Swap', value: 18 },
    { name: 'SMS Impersonation', value: 11 },
  ],
  trend: [
    { month: 'Apr', cases: 180 }, { month: 'May', cases: 205 }, { month: 'Jun', cases: 240 },
    { month: 'Jul', cases: 268 }, { month: 'Aug', cases: 290 }, { month: 'Sep', cases: 312 },
  ],
}

export const MOCK_AUDIT_LOGS = [
  { action_id: 1, actor_username: 'supervisor.demo', action_type: 'APPROVE_FREEZE', target_report_id: 'NDSIR-2026-K9M3ZT', status_code: 'SUCCESS', ip_address: '10.0.4.12', timestamp: '2026-09-14T07:40:00Z' },
  { action_id: 2, actor_username: 'analyst.demo', action_type: 'PROPOSE_FREEZE', target_report_id: 'NDSIR-2026-K9M3ZT', status_code: 'SUCCESS', ip_address: '10.0.4.31', timestamp: '2026-09-14T07:20:00Z' },
  { action_id: 3, actor_username: 'analyst.demo', action_type: 'PROPOSE_TELECOM_ESCALATION', target_report_id: 'NDSIR-2026-7F3K9Q', status_code: 'SUCCESS', ip_address: '10.0.4.31', timestamp: '2026-09-13T15:10:00Z' },
  { action_id: 4, actor_username: 'supervisor.demo', action_type: 'EXPORT_COURT_PACKAGE', target_report_id: 'NDSIR-2026-K9M3ZT', status_code: 'SUCCESS', ip_address: '10.0.4.12', timestamp: '2026-09-13T11:00:00Z' },
  { action_id: 5, actor_username: 'police.demo', action_type: 'DOWNLOAD_COURT_PACKAGE', target_report_id: 'NDSIR-2026-K9M3ZT', status_code: 'SUCCESS', ip_address: '41.185.10.7', timestamp: '2026-09-13T13:22:00Z' },
]

export const MOCK_USERS = [
  { id: 'u1', username: 'analyst.demo', role: 'INSA_ANALYST', organization_code: 'INSA', is_active: true, is_suspended: false, is_mfa_enabled: true },
  { id: 'u2', username: 'supervisor.demo', role: 'INSA_SUPERVISOR', organization_code: 'INSA', is_active: true, is_suspended: false, is_mfa_enabled: true },
  { id: 'u3', username: 'auditor.demo', role: 'AUDITOR', organization_code: 'INSA', is_active: true, is_suspended: false, is_mfa_enabled: true },
  { id: 'u4', username: 'cbe.riskofficer', role: 'BANK_AGENT', organization_code: 'CBE', is_active: true, is_suspended: false, is_mfa_enabled: false },
  { id: 'u5', username: 'fedpol.liaison1', role: 'POLICE_LIAISON', organization_code: 'FEDPOL-CIB', is_active: true, is_suspended: false, is_mfa_enabled: false },
]

export const MOCK_FREEZE_ORDERS = [
  { id: 'f1', report_tracking_code: 'NDSIR-2026-K9M3ZT', destination_bank_code: 'CBE', account_number: '1000123456789', status: 'ACKNOWLEDGED', created_at: '2026-09-14T07:20:00Z' },
  { id: 'f2', report_tracking_code: 'NDSIR-2026-7F3K9Q', destination_bank_code: 'TELEBIRR', account_number: '0911223344', status: 'SENT', created_at: '2026-09-13T15:00:00Z' },
]

export const MOCK_WARRANT_PACKAGES = [
  { id: 1, report_tracking_code: 'NDSIR-2026-K9M3ZT', is_approved: true, created_at: '2026-09-13T11:00:00Z', package_hash_sha256: 'a83f...c21e' },
]
