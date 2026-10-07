// ==========================================
// PLATFORM BRANDING & METADATA
// ==========================================
export const PLATFORM_NAME = "EthioCyber Shield";
export const PLATFORM_NAME_AM = "ኢትዮ ሳይበር ሽልድ";
export const PLATFORM_TAGLINE = "National Digital Scam & Cybercrime Reporting Portal";
export const OFFICIAL_AGENCY_REF = "ETHIO-CERT Aligned Framework";

// ==========================================
// ROLES & WORKFLOWS
// ==========================================
export const ROLES = {
  CITIZEN: 'CITIZEN',
  INSA_ANALYST: 'INSA_ANALYST',
  INSA_SUPERVISOR: 'INSA_SUPERVISOR',
  AUDITOR: 'AUDITOR',
  ADMIN: 'ADMIN',
  BANK_AGENT: 'BANK_AGENT',
  POLICE_LIAISON: 'POLICE_LIAISON',
}

export const ROLE_LABELS = {
  [ROLES.CITIZEN]: 'Citizen',
  [ROLES.INSA_ANALYST]: 'INSA Forensic Analyst',
  [ROLES.INSA_SUPERVISOR]: 'INSA Operations Supervisor',
  [ROLES.AUDITOR]: 'System & Compliance Auditor',
  [ROLES.ADMIN]: 'System Administrator',
  [ROLES.BANK_AGENT]: 'Bank / Financial Institution Agent',
  [ROLES.POLICE_LIAISON]: 'Federal Police CIB Liaison',
}

export const ROLE_HOME_ROUTE = {
  [ROLES.INSA_ANALYST]: '/console/triage',
  [ROLES.INSA_SUPERVISOR]: '/console/triage',
  [ROLES.AUDITOR]: '/console/audit-logs',
  [ROLES.ADMIN]: '/console/admin/users',
  [ROLES.BANK_AGENT]: '/partners/bank/holds',
  [ROLES.POLICE_LIAISON]: '/partners/police/warrants',
}

export const INCIDENT_TYPES = [
  { value: 'VOICE_SCAM', label: 'Voice Scam' },
  { value: 'PHISHING', label: 'Phishing Link' },
  { value: 'MOBILE_BANKING_FRAUD', label: 'Mobile Banking Fraud' },
  { value: 'SMS_IMPERSONATION', label: 'SMS Impersonation' },
  { value: 'SIM_SWAP', label: 'SIM Swap Fraud' },
  { value: 'OTHER', label: 'Other' },
]

export const INCIDENT_STATUS_META = {
  PENDING: { label: 'Pending', tone: 'amber' },
  IN_REVIEW: { label: 'In Review', tone: 'signal' },
  FROZEN: { label: 'Frozen', tone: 'critical' },
  ESCALATED: { label: 'Escalated', tone: 'critical' },
  CLOSED: { label: 'Closed', tone: 'verified' },
  REJECTED: { label: 'Rejected', tone: 'fog' },
}

// Statuses for AssetFreezeOrder / TelecomEscalationOrder - a distinct
// lifecycle from IncidentReport.status (see backend FreezeOrderStatus).
export const ORDER_STATUS_META = {
  PROPOSED: { label: 'Awaiting approval', tone: 'amber' },
  APPROVED: { label: 'Approved', tone: 'signal' },
  SENT: { label: 'Sent to institution', tone: 'signal' },
  ACKNOWLEDGED: { label: 'Acknowledged', tone: 'verified' },
  REJECTED: { label: 'Rejected', tone: 'fog' },
  FAILED: { label: 'Delivery failed', tone: 'critical' },
}

// Amharic labels for the same incident statuses, used on citizen-facing
// pages (CaseTrackerPage) via StatusBadge's metaMap override - same
// mechanism as ORDER_STATUS_META above, just swapping display text.
export const INCIDENT_STATUS_META_AM = {
  PENDING: { label: 'በመጠባበቅ ላይ', tone: 'amber' },
  IN_REVIEW: { label: 'በግምገማ ላይ', tone: 'signal' },
  FROZEN: { label: 'ታግዷል', tone: 'critical' },
  ESCALATED: { label: 'ደረጃው ከፍ ብሏል', tone: 'critical' },
  CLOSED: { label: 'ተዘግቷል', tone: 'verified' },
  REJECTED: { label: 'ውድቅ ተደርጓል', tone: 'fog' },
}

export const RISK_BANDS = [
  { max: 30, label: 'Low', tone: 'verified' },
  { max: 69, label: 'Elevated', tone: 'amber' },
  { max: 100, label: 'Critical', tone: 'critical' },
]

export function riskBand(score) {
  return RISK_BANDS.find((b) => score <= b.max) || RISK_BANDS[RISK_BANDS.length - 1]
}