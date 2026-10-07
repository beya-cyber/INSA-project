// src/store/ndsirStore.js
// ---------------------------------------------------------------------------
// NDSIR shared command-network store: pure state, seed data, reducer, selectors.
// No React in this file, so the cross-portal flows can be unit-tested in Node.
//
// DEMO-GRADE CRYPTO: the audit trail is a real SHA-256 hash chain and entries
// carry an HMAC-SHA256 "signature", but the signing key and PIN checks live in
// the browser. A production deployment must move signing, PIN verification and
// the append-only ledger to the Django backend (apps/audit_logs) with an
// HSM/KMS-held key.
// ---------------------------------------------------------------------------
import { sha256Hex, sha256Bytes, hmacSha256Hex } from '../lib/sha256'
import { makeGatewayRef } from '../lib/format'

export const STORE_VERSION = 1
export const SIGNING_KEY = 'NDSIR-DEMO-HMAC-KEY-v1'
export const GENESIS = '0'.repeat(64)
export const PINS = { analyst: '1234', bank: '4321', police: '7777' }
export const SLA_TARGET_MS = 120000 // bank must execute a dispatched freeze within 2 minutes

export const INSTITUTIONS = [
  { name: 'Commercial Bank of Ethiopia', key: 'commercial', short: 'CBE', gatewayCode: 'CBE_CORE_DIRECT_GATEWAY', nodeId: 'NODE-CBE-API' },
  { name: 'Telebirr P2P', key: 'telebirr', short: 'Telebirr', gatewayCode: 'ETH_TELEBIRR_API_v2', nodeId: 'NODE-TBR-P2P' },
  { name: 'Awash Bank', key: 'awash', short: 'Awash', gatewayCode: 'AWASH_SECURE_LINK', nodeId: 'NODE-AWASH-API' },
  { name: 'Bank of Abyssinia', key: 'abyssinia', short: 'Abyssinia', gatewayCode: 'BOA_SWITCH_API_v1', nodeId: 'NODE-BOA-API' },
]
export const instByName = (name) => INSTITUTIONS.find((i) => i.name === name)

export const ROLE_LABELS = {
  analyst: 'Fraud Analyst Hub', bank: 'Commercial Bank Portal', police: 'Law Enforcement / Police',
  admin: 'System Administrator', auditor: 'Compliance Auditor',
}
export const DEFAULT_ACTORS = {
  analyst: 'Analyst_Behailu_K', bank: 'Officer_Selam_T', police: 'Insp_Dawit_M', admin: 'SysAdmin_Hiwot_G', auditor: 'Auditor_Mulugeta_T',
}

// ------------------------------------------------------------------ audit chain
const entryHash = (e) => sha256Hex(JSON.stringify([e.seq, e.ts, e.actor, e.role, e.action, e.details, e.prevHash]))

export function makeEntry(prev, { ts, actor, role, action, details }) {
  const seq = prev ? prev.seq + 1 : 1
  const e = { seq, id: `LOG-${String(seq).padStart(4, '0')}`, ts, actor, role, action, details, prevHash: prev ? prev.hash : GENESIS }
  e.hash = entryHash(e)
  e.sig = hmacSha256Hex(SIGNING_KEY, e.hash)
  return e
}

export function verifyChain(entries) {
  const results = entries.map((e, i) => {
    const linkOk = e.prevHash === (i === 0 ? GENESIS : entries[i - 1].hash) && e.seq === i + 1
    const hashOk = entryHash(e) === e.hash
    const sigOk = hmacSha256Hex(SIGNING_KEY, e.hash) === e.sig
    return { seq: e.seq, linkOk, hashOk, sigOk, ok: linkOk && hashOk && sigOk }
  })
  const bad = results.find((r) => !r.ok)
  return { ok: !bad, firstBad: bad ? bad.seq : null, results, validCount: results.filter((r) => r.ok).length }
}

const log = (s, rec) => ({ ...s, audit: [...s.audit, makeEntry(s.audit[s.audit.length - 1], rec)] })
const logMany = (s, recs) => recs.reduce(log, s)

function sys(s, { ts, level = 'INFO', source, type, message }) {
  const id = `EVT-${s.seq.evt}`
  return { ...s, seq: { ...s.seq, evt: s.seq.evt + 1 }, sysEvents: [{ id, ts, level, source, type, message }, ...s.sysEvents].slice(0, 200) }
}

// -------------------------------------------------------------- signatures
export const warrantPayload = (w) => `${w.id}|${w.targetEntity}|${w.legalRef}|${w.judge}|${w.investigator}`
export const signWarrantPayload = (w) => hmacSha256Hex(SIGNING_KEY, `WARRANT|${warrantPayload(w)}`)
export const validateWarrantSignature = (w, sig) => !!w && !!sig && w.signature === sig.trim() && signWarrantPayload(w) === sig.trim()

// ------------------------------------------------- deterministic telemetry
function prng(seedStr) {
  let h = sha256Bytes(seedStr)
  let i = 0
  return () => {
    if (i >= 30) { h = sha256Bytes(h); i = 0 }
    const v = ((h[i] << 8) | h[i + 1]) / 65535
    i += 2
    return v
  }
}
const luhn = (d14) => {
  let sum = 0
  for (let i = 0; i < 14; i++) {
    let n = Number(d14[13 - i])
    if (i % 2 === 0) { n *= 2; if (n > 9) n -= 9 }
    sum += n
  }
  return String((10 - (sum % 10)) % 10)
}
const TOWERS = [
  ['ADD-BOLE-014', 'Bole', 8.9806, 38.7578], ['ADD-PIASSA-003', 'Piassa', 9.035, 38.7469], ['ADD-MERKATO-021', 'Merkato', 9.032, 38.736],
  ['ADD-KAZANCHIS-009', 'Kazanchis', 9.0189, 38.7636], ['ADD-MEGENAGNA-017', 'Megenagna', 9.02, 38.799], ['ADD-CMC-006', 'CMC', 9.0, 38.83],
]
const MODELS = ['Tecno Spark 10', 'Infinix Hot 30', 'itel A60', 'Samsung Galaxy A14', 'Tecno Camon 20']

export function genTelemetry(phone, now) {
  const r = prng(`telemetry:${phone}`)
  const pick = (arr) => arr[Math.floor(r() * arr.length) % arr.length]
  const ipdr = Array.from({ length: 8 }, (_, k) => ({
    ts: now - (k + 1) * Math.floor(8 + r() * 25) * 60000,
    srcIp: `196.188.${Math.floor(r() * 250)}.${Math.floor(r() * 250)}`,
    dstIp: `${pick(['203.0.113', '198.51.100'])}.${Math.floor(r() * 250)}`,
    port: pick([443, 443, 80, 5222, 8443]),
    bytes: Math.floor(2000 + r() * 900000),
    cell: pick(TOWERS)[0],
  }))
  const imei = (() => { const d = Array.from({ length: 14 }, () => Math.floor(r() * 10)).join(''); return d + luhn(d) })()
  const devices = [{ imei, model: pick(MODELS), firstSeen: now - Math.floor(2 + r() * 20) * 86400000, lastSeen: now - 600000, linkedMsisdns: [phone, `+251 9${Math.floor(r() * 9)} ${Math.floor(100 + r() * 899)} ${Math.floor(1000 + r() * 8999)}`] }]
  const towers = Array.from({ length: 6 }, (_, k) => {
    const t = pick(TOWERS)
    return { ts: now - (k + 1) * Math.floor(6 + r() * 14) * 60000, towerId: t[0], area: t[1], lat: t[2], lon: t[3], signal: -Math.floor(60 + r() * 35) }
  })
  return { ipdr, devices, towers }
}

// ------------------------------------------------------------------- seeds
const H = 3600000
const M = 60000
const mkFile = (dossierId, name, size, kind, preview, extra = {}) => {
  const content = `ARTIFACT::${dossierId}::${name}::${size}`
  return { name, size, kind, preview, content, sha256: sha256Hex(content), verified: false, ...extra }
}

function seedNodes() {
  const n = (id, name, type, kind, region, latency, uptime, inst) => ({ id, name, type, kind, region, inst: inst || null, status: kind === 'bank' || kind === 'telecom' ? 'SYNCED' : 'ONLINE', latency, base: latency, uptime, requests: 0, acks: 0, history: Array.from({ length: 20 }, () => latency) })
  return [
    n('NODE-ADDIS-01', 'INSA Core Gateway', 'Primary API Hub', 'core', 'Addis Ababa · DC-1', 12, 99.99),
    n('NODE-ADDIS-02', 'INSA Core Gateway (Hot Standby)', 'Redundant API Hub', 'backup', 'Addis Ababa · DC-2', 14, 99.97),
    n('NODE-BDR-BK', 'Disaster Recovery Site', 'Backup Server', 'backup', 'Bahir Dar', 31, 99.9),
    n('NODE-HWS-BK', 'Disaster Recovery Site', 'Backup Server', 'backup', 'Hawassa', 34, 99.9),
    n('NODE-CBE-API', 'Commercial Bank of Ethiopia', 'Financial Bridge', 'bank', 'Addis Ababa', 45, 99.8, 'Commercial Bank of Ethiopia'),
    n('NODE-TBR-P2P', 'Telebirr P2P Switch', 'Mobile Money Bridge', 'telecom', 'Addis Ababa', 52, 99.7, 'Telebirr P2P'),
    n('NODE-AWASH-API', 'Awash Bank Gateway', 'Financial Bridge', 'bank', 'Addis Ababa', 41, 99.8, 'Awash Bank'),
    n('NODE-BOA-API', 'Bank of Abyssinia Gateway', 'Financial Bridge', 'bank', 'Addis Ababa', 38, 99.8, 'Bank of Abyssinia'),
    n('NODE-POLICE-WARRANT', 'Federal Police Warrant Hub', 'Judicial Integration', 'judicial', 'Addis Ababa', 19, 99.9),
  ]
}

const WAF_TYPES = [
  ['SQL_INJECTION', 'CRIT', "' OR 1=1 -- on /api/v1/incidents/search"], ['DDOS_SYN_FLOOD', 'CRIT', 'SYN flood 48k pps against api gateway'],
  ['BRUTE_FORCE_LOGIN', 'WARN', '37 failed logins in 60s on /staff/login'], ['XSS_ATTEMPT', 'WARN', '<script> payload in report statement field'],
  ['PATH_TRAVERSAL', 'WARN', '../../etc/passwd in evidence download path'],
]
export const WAF_CATALOG = WAF_TYPES

function seedWaf(now) {
  return Array.from({ length: 8 }, (_, i) => {
    const t = WAF_TYPES[i % WAF_TYPES.length]
    return { id: `WAF-${i + 1}`, ts: now - (i + 1) * 17 * M, type: t[0], severity: t[1], detail: t[2], srcIp: `185.${10 + i}.${40 + i * 7}.${20 + i * 11}`, action: 'BLOCKED', rule: `OWASP-CRS-9${40 + i}` }
  })
}

function seedUsers() {
  const u = (id, name, role, portal, agency, tier, status = 'ACTIVE') => ({ id, name, role, portal, agency, tier, status, lastAudit: null })
  return [
    u('INS-10021-ET', 'Behailu K.', 'Fraud Analyst', 'analyst', 'INSA · Cybercrime Triage', 2),
    u('INS-10022-ET', 'Samuel T.', 'Fraud Analyst', 'analyst', 'INSA · Cybercrime Triage', 2),
    u('CBE-30417-ET', 'Selam T.', 'Bank Security Officer', 'bank', 'Commercial Bank of Ethiopia', 3),
    u('AWB-30511-ET', 'Meron A.', 'Bank Security Officer', 'bank', 'Awash Bank', 3),
    u('FPL-40208-ET', 'Dawit M.', 'Federal Police Investigator', 'police', 'Federal Police · Cyber Division', 3),
    u('FCT-40911-ET', 'Hiber T.', 'Magistrate Judge', 'police', 'Federal Court', 4),
    u('INS-10001-ET', 'Hiwot G.', 'System Administrator', 'admin', 'INSA · Infrastructure', 5),
    u('NBE-50077-ET', 'Mulugeta T.', 'Compliance Auditor', 'auditor', 'National Bank of Ethiopia', 3),
    u('NBE-50078-ET', 'Sara H.', 'Compliance Auditor', 'auditor', 'National Bank of Ethiopia', 2, 'SUSPENDED'),
  ]
}

export const PERMISSIONS = [
  ['ingest_threats', 'Ingest threats & verify evidence'], ['dispatch_freeze', 'Dispatch freeze commands'], ['execute_freeze', 'Execute / restore account freezes'],
  ['issue_warrants', 'Draft & serve warrants'], ['sign_warrants', 'Ratify (sign) warrants'], ['view_evidence', 'View evidence locker'],
  ['node_control', 'Isolate nodes / kill switch'], ['manage_users', 'Provision & elevate users'], ['read_audit', 'Read immutable audit trail'], ['export_reports', 'Export certified reports'],
]
export const ROLE_PERMS = {
  analyst: ['ingest_threats', 'dispatch_freeze', 'view_evidence', 'read_audit'],
  bank: ['execute_freeze', 'read_audit'],
  police: ['issue_warrants', 'sign_warrants', 'view_evidence', 'read_audit'],
  admin: ['node_control', 'manage_users', 'read_audit'],
  auditor: ['read_audit', 'export_reports', 'view_evidence'],
}

export function createSeedState(now = Date.now()) {
  const s0 = {
    v: STORE_VERSION, epoch: 0, createdAt: now,
    seq: { incident: 905, dossier: 884, order: 902, rec: 4, evidence: 2, warrant: 452, suspect: 2, evt: 6, waf: 9, tf: 1, user: 100, rst: 2 },
    failures: { analyst: 0, bank: 0, police: 0 },
    dossiers: [], incidents: [], orders: [], recovery: [], evidence: [], suspects: [], warrants: [], taskForce: [],
    audit: [], nodes: seedNodes(), waf: seedWaf(now), blocklist: [], sysEvents: [], users: seedUsers(),
    velocityBase: [3, 2, 2, 1, 1, 2, 4, 6, 9, 12, 15, 11, 10, 13, 17, 22, 19, 14, 12, 9, 7, 6, 5, 4],
    shareBase: { 'Commercial Bank of Ethiopia': 38, 'Telebirr P2P': 31, 'Awash Bank': 14, 'Bank of Abyssinia': 17 },
  }

  // ---- dossiers
  const f1 = mkFile('SUB-881', 'telebirr_fake_receipt.pdf', '2.4 MB', 'document', 'Forged Telebirr receipt: "Transfer ETB 45,000 to agent #409 — SUCCESS". Ref number does not exist in the Telebirr ledger.', { verified: true })
  const f2 = mkFile('SUB-881', 'call_recording_intercept.mp3', '4.1 MB', 'audio', '[Simulated transcript] "Dear customer, your account needs a system upgrade. Please dial *999*… and enter your PIN to avoid suspension." — synthetic voice, 84 s.', { verified: true, durationSec: 84 })
  const f3 = mkFile('SUB-882', 'cbe_phishing_screenshot.png', '1.8 MB', 'image', 'Screenshot of lookalike portal "cbe-birr-secure[.]com" asking for username, password and OTP.')
  const f4 = mkFile('SUB-882', 'telegram_chat_export.json', '450 KB', 'data', '{"channel":"@HighYieldTBills_ET","messages":[{"text":"Treasury bills 18% weekly — click to invest","link":"cbe-birr-secure[.]com"}]}')
  let d = [
    { id: 'SUB-881', victimName: 'Alemayehu Tadesse', nationalId: 'NID-ET-8912-9011', phone: '+251 91 123 4567', inst: 'Telebirr P2P', amount: 45000, vector: 'SIM Swap & Social Engineering', channel: 'Citizen Web Portal',
      suspectAccount: 'ACC-9921-****-4100', suspectHolder: 'Kebede Alemu (Agent #409)', suspectPhone: '+251 91 998 4100',
      statement: 'Victim received an automated call claiming system upgrade, was prompted to enter USSD string, and lost funds within 3 minutes.', files: [f1, f2], date: now - 5 * H, status: 'DOSSIER_VERIFIED', incidentId: null },
    { id: 'SUB-882', victimName: 'Hanna Bekele', nationalId: 'NID-ET-3321-1109', phone: '+251 92 345 6789', inst: 'Commercial Bank of Ethiopia', amount: 120000, vector: 'Phishing Portal (CBE-Birr clone)', channel: 'Telegram Bot',
      suspectAccount: 'ACC-4412-****-8820', suspectHolder: 'Bethelhem Mulugeta', suspectPhone: '+251 92 774 8820',
      statement: 'Victim clicked a sponsored lookalike web link via Telegram advertising high-interest treasury bills and entered banking credentials.', files: [f3, f4], date: now - 3 * H, status: 'PENDING_ANALYST_REVIEW', incidentId: null },
  ]
  s0.dossiers = d

  // ---- incidents & orders
  const tgt = (inst, account, holder, amount, orderId = null) => ({ inst, account, holder, amount, gatewayCode: instByName(inst).gatewayCode, orderId })
  s0.incidents = [
    { id: 'INC-2026-904', risk: 'MEDIUM', vector: 'Credential Stuffing', victim: 'Walk-in referral', createdAt: now - 40 * M, dossierId: null, targets: [tgt('Awash Bank', 'ACC-7734-****-1290', 'Tigist Haile', 95000)] },
    { id: 'INC-2026-903', risk: 'HIGH', vector: 'Synthetic Identity', victim: 'Bank referral', createdAt: now - 55 * M, dossierId: null, targets: [tgt('Bank of Abyssinia', 'ACC-1102-****-3321', 'Dawit Bekele', 180000)] },
    { id: 'INC-2026-902', risk: 'HIGH', vector: 'Unauthorized Bulk Transfer', victim: 'Citizen Web Portal', createdAt: now - 70 * M, dossierId: null, targets: [tgt('Commercial Bank of Ethiopia', 'ACC-4412-****-8819', 'Bethelhem Mulugeta', 200000), tgt('Telebirr P2P', 'ACC-7781-****-0042', 'Yonas Hailu', 120000)] },
    { id: 'INC-2026-901', risk: 'CRITICAL', vector: 'SIM Swap / Phishing', victim: 'Telebirr P2P ingestion', createdAt: now - 3 * H - 5 * M, dossierId: null, targets: [tgt('Telebirr P2P', 'ACC-9921-****-4100', 'Kebede Alemu (Agent #409)', 450000, 'FRZ-901')] },
    { id: 'INC-2026-900', risk: 'HIGH', vector: 'Account Takeover', victim: 'Bank referral', createdAt: now - 5 * H - 4 * M, dossierId: null, targets: [tgt('Awash Bank', 'ACC-6120-****-7741', 'Lemlem Assefa', 310000, 'FRZ-900')] },
    { id: 'INC-2026-899', risk: 'HIGH', vector: 'Unauthorized Bulk Transfer', victim: 'Citizen Web Portal', createdAt: now - 9 * H - 3 * M, dossierId: null, targets: [tgt('Commercial Bank of Ethiopia', 'ACC-3301-****-2210', 'Samuel Getachew', 275000, 'FRZ-899')] },
  ]
  const hist = (id, incidentId, inst, account, holder, amount, severity, dispatchedAt, latency, victim) => {
    const executedAt = dispatchedAt + latency
    return { id, incidentId, inst, gatewayCode: instByName(inst).gatewayCode, account, holder, amount, severity, source: 'NDSIR Analyst Hub', status: 'FROZEN_SECURED', dispatchedAt, dispatchedBy: DEFAULT_ACTORS.analyst, executedAt, executedBy: DEFAULT_ACTORS.bank, gatewayRef: makeGatewayRef(inst, id + executedAt), ack: true, victimName: victim, victimNid: null, warrantId: null }
  }
  s0.orders = [
    hist('FRZ-901', 'INC-2026-901', 'Telebirr P2P', 'ACC-9921-****-4100', 'Kebede Alemu (Agent #409)', 450000, 'CRITICAL', now - 3 * H, 41000, 'Alemayehu Tadesse'),
    hist('FRZ-900', 'INC-2026-900', 'Awash Bank', 'ACC-6120-****-7741', 'Lemlem Assefa', 310000, 'HIGH', now - 5 * H, 133000, 'Rahel Tsegaye'),
    hist('FRZ-899', 'INC-2026-899', 'Commercial Bank of Ethiopia', 'ACC-3301-****-2210', 'Samuel Getachew', 275000, 'HIGH', now - 9 * H, 28000, 'Yared Mekonnen'),
  ]
  const rec = (id, o, status) => ({ id, orderId: o.id, account: o.account, holder: o.holder, amount: o.amount, inst: o.inst, victimName: o.victimName, victimNid: o.victimNid, gatewayRef: o.gatewayRef, heldAt: o.executedAt, status, receipt: null })
  s0.recovery = [rec('REC-3', s0.orders[2], 'ESCROW_HELD'), rec('REC-2', s0.orders[1], 'ESCROW_HELD'), rec('REC-1', s0.orders[0], 'ESCROW_HELD')]
  s0.nodes = s0.nodes.map((nd) => (nd.inst ? { ...nd, requests: s0.orders.filter((o) => o.inst === nd.inst).length, acks: s0.orders.filter((o) => o.inst === nd.inst).length } : nd))

  // ---- evidence + suspects for the pre-verified dossier
  const d0 = d[0]
  s0.evidence = [{ id: 'EVD-1', dossierId: d0.id, victimName: d0.victimName, nationalId: d0.nationalId, suspectPhone: d0.suspectPhone, suspectAccount: d0.suspectAccount, inst: d0.inst, amount: d0.amount, vector: d0.vector, files: d0.files.map((f) => ({ ...f })), linkedAt: now - 4 * H, linkedBy: DEFAULT_ACTORS.analyst, custody: [{ ts: now - 4 * H, actor: DEFAULT_ACTORS.analyst, action: 'LINKED_FROM_ANALYST_DOSSIER' }] }]
  const tel = genTelemetry(d0.suspectPhone, now)
  s0.suspects = [{ id: 'SUS-1', phone: d0.suspectPhone, alias: d0.suspectHolder, accounts: [d0.suspectAccount], inst: d0.inst, dossierId: d0.id, status: 'AT_LARGE', ...tel }]

  // ---- warrants (original three, now with real signatures)
  const mkW = (w) => { const full = { signature: null, signedAt: null, signedBy: null, servedAt: null, orderId: null, evidenceId: null, holder: 'Unknown', amount: 0, inst: null, ...w }; if (w.status === 'RATIFIED_ACTIVE' || w.status === 'EXECUTED_ARCHIVED') { full.signature = signWarrantPayload(full); full.signedAt = w.timestamp + 2 * H; full.signedBy = w.judge } return full }
  s0.warrants = [
    mkW({ id: 'WAR-2026-451', timestamp: now - 30 * H, caseTitle: 'Cryptocurrency Ransomware Layering', investigator: 'Inspector Dawit M.', judge: 'Hon. Magistrate Judge Almaz B.', targetEntity: 'Wallet Hash 0x71C...92A', legalRef: 'Anti-Money Laundering Proclamation', status: 'EXECUTED_ARCHIVED' }),
    mkW({ id: 'WAR-2026-450', timestamp: now - 26 * H, caseTitle: 'SIM Swap & Mobile Money Intercept', investigator: 'Sergeant Samuel K.', judge: 'Pending Court Assignment', targetEntity: 'Telebirr #0911223344', legalRef: 'Criminal Procedure Code Art. 32', status: 'PENDING_JUDICIAL_SIGN', inst: 'Telebirr P2P', holder: 'Unknown (KYC pending)', amount: 85000 }),
    mkW({ id: 'WAR-2026-449', timestamp: now - 24 * H, caseTitle: 'Operation PhishNet - Syndicate Node Alpha', investigator: 'Inspector Dawit M. (Federal Police Cyber Division)', judge: 'Hon. Magistrate Judge Hiber T.', targetEntity: 'Account #1000892341209 (CBE)', legalRef: 'Cybercrime Proclamation 1185/2020 Art. 24', status: 'RATIFIED_ACTIVE', inst: 'Commercial Bank of Ethiopia', holder: 'Syndicate Node Alpha', amount: 640000 }),
  ]

  // ---- seeded audit chain (appended through the same code path as live events)
  const A = DEFAULT_ACTORS
  let s = s0
  const seedLog = [
    [now - 31 * H, 'System Auto-Dispatcher', 'system', 'SYSTEM_INIT', 'NDSIR command network initialised; hash chain genesis block created'],
    [now - 9 * H - 3 * M, 'System Auto-Dispatcher', 'system', 'QUEUED_INCIDENT', 'Incident INC-2026-899 ingested from Citizen Web Portal'],
    [now - 9 * H, A.analyst, 'analyst', 'DISPATCH_API_GATEWAY', 'Order FRZ-899 → Commercial Bank of Ethiopia [CBE_CORE_DIRECT_GATEWAY] ETB 275,000'],
    [now - 9 * H + 28000, A.bank, 'bank', 'EXECUTE_FREEZE', `Order FRZ-899 frozen · ref ${s0.orders[2].gatewayRef} · latency 28s (within SLA)`],
    [now - 5 * H, A.analyst, 'analyst', 'DISPATCH_API_GATEWAY', 'Order FRZ-900 → Awash Bank [AWASH_SECURE_LINK] ETB 310,000'],
    [now - 5 * H + 133000, A.bank, 'bank', 'EXECUTE_FREEZE', `Order FRZ-900 frozen · ref ${s0.orders[1].gatewayRef} · latency 133s (SLA BREACH)`],
    [now - 4 * H, A.analyst, 'analyst', 'VERIFY_EVIDENCE', 'SHA-256 verified artifacts of dossier SUB-881; linked to Police Evidence Locker as EVD-1'],
    [now - 3 * H, A.analyst, 'analyst', 'DISPATCH_API_GATEWAY', 'Order FRZ-901 → Telebirr P2P [ETH_TELEBIRR_API_v2] ETB 450,000'],
    [now - 3 * H + 41000, A.bank, 'bank', 'EXECUTE_FREEZE', `Order FRZ-901 frozen · ref ${s0.orders[0].gatewayRef} · latency 41s (within SLA)`],
    [now - 24 * H + 2 * H, 'Hon. Magistrate Judge Hiber T.', 'police', 'WARRANT_SIGNED', 'Warrant WAR-2026-449 ratified and cryptographically signed'],
  ].sort((a, b) => a[0] - b[0])
  seedLog.forEach(([ts, actor, role, action, details]) => { s = log(s, { ts, actor, role, action, details }) })
  s = sys(s, { ts: now - 3 * H, level: 'INFO', source: 'NODE-TBR-P2P', type: 'API_GATEWAY_CALL', message: 'Emergency freeze FRZ-901 acknowledged by Telebirr switch (41 s)' })
  s = sys(s, { ts: now - 40 * M, level: 'INFO', source: 'NODE-ADDIS-01', type: 'HEALTH_CHECK', message: 'All national command nodes passed health probe' })
  return s
}

// --------------------------------------------------------------- selectors
export const nodeFor = (s, inst) => s.nodes.find((n) => n.inst === inst)
export const isReachable = (s, inst) => { const n = nodeFor(s, inst); return !n || n.status !== 'ISOLATED' }

export function incidentStatus(incident, orders) {
  const linked = incident.targets.map((t) => (t.orderId ? orders.find((o) => o.id === t.orderId) : null))
  const dispatched = linked.filter(Boolean)
  if (!dispatched.length) return 'PENDING_FREEZE'
  if (dispatched.some((o) => o.status === 'PENDING_EXECUTION')) return 'DISPATCHED'
  if (dispatched.length < linked.length) return 'PARTIALLY_DISPATCHED'
  if (dispatched.every((o) => o.status === 'RESTORED_FALSE_POSITIVE')) return 'RESTORED'
  return 'FROZEN_SECURED'
}

export function computeSla(orders, now) {
  const done = orders.filter((o) => o.executedAt)
  const lat = done.map((o) => o.executedAt - o.dispatchedAt)
  const within = lat.filter((l) => l <= SLA_TARGET_MS).length
  const pending = orders.filter((o) => o.status === 'PENDING_EXECUTION')
  const breachedPending = pending.filter((o) => now - o.dispatchedAt > SLA_TARGET_MS)
  const perInst = INSTITUTIONS.map((i) => {
    const mine = done.filter((o) => o.inst === i.name)
    const ml = mine.map((o) => o.executedAt - o.dispatchedAt)
    return { inst: i.name, short: i.short, executed: mine.length, avgMs: ml.length ? ml.reduce((a, b) => a + b, 0) / ml.length : null, withinPct: ml.length ? Math.round((ml.filter((l) => l <= SLA_TARGET_MS).length / ml.length) * 100) : null, pending: pending.filter((o) => o.inst === i.name).length }
  })
  return { executed: done.length, avgMs: lat.length ? lat.reduce((a, b) => a + b, 0) / lat.length : null, withinPct: lat.length ? Math.round((within / lat.length) * 100) : 100, pending: pending.length, breachedPending: breachedPending.length, perInst }
}

export function velocitySeries(s, now) {
  const buckets = [...s.velocityBase]
  s.orders.forEach((o) => { const k = 23 - Math.floor((now - o.dispatchedAt) / H); if (k >= 0 && k < 24) buckets[k] += 1 })
  return buckets.map((v, i) => ({ v, hour: new Date(now - (23 - i) * H).getHours() }))
}

export function institutionShares(s) {
  const counts = { ...s.shareBase }
  s.incidents.forEach((i) => i.targets.forEach((t) => { counts[t.inst] = (counts[t.inst] || 0) + 1 }))
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  return INSTITUTIONS.map((i) => ({ ...i, count: counts[i.name] || 0, pct: Math.round(((counts[i.name] || 0) / total) * 1000) / 10 }))
}

export const pinStats = (audit) => {
  const ok = audit.filter((e) => /_PIN_VERIFIED$/.test(e.action)).length
  const bad = audit.filter((e) => e.action === 'PIN_VERIFICATION_FAILED').length
  return { ok, bad, pct: ok + bad ? Math.round((ok / (ok + bad)) * 1000) / 10 : 100 }
}

// ----------------------------------------------------------------- reducer
const sevOf = (amount) => (amount >= 300000 ? 'CRITICAL' : amount >= 100000 ? 'HIGH' : 'MEDIUM')
const bumpNode = (nodes, inst, field) => nodes.map((n) => (n.inst === inst ? { ...n, [field]: n[field] + 1 } : n))
const fmtN = (n) => `ETB ${Number(n).toLocaleString('en-US')}`

function linkEvidence(s, dossier, ts, actor) {
  if (s.evidence.some((e) => e.dossierId === dossier.id)) return s
  const evId = `EVD-${s.seq.evidence}`
  let next = { ...s, seq: { ...s.seq, evidence: s.seq.evidence + 1 } }
  next.evidence = [{ id: evId, dossierId: dossier.id, victimName: dossier.victimName, nationalId: dossier.nationalId, suspectPhone: dossier.suspectPhone, suspectAccount: dossier.suspectAccount, inst: dossier.inst, amount: dossier.amount, vector: dossier.vector, files: dossier.files.map((f) => ({ ...f })), linkedAt: ts, linkedBy: actor, custody: [{ ts, actor, action: 'LINKED_FROM_ANALYST_DOSSIER' }] }, ...next.evidence]
  if (dossier.suspectPhone && !next.suspects.some((x) => x.phone === dossier.suspectPhone)) {
    const sid = `SUS-${next.seq.suspect}`
    next.seq = { ...next.seq, suspect: next.seq.suspect + 1 }
    next.suspects = [{ id: sid, phone: dossier.suspectPhone, alias: dossier.suspectHolder || 'Unidentified suspect', accounts: [dossier.suspectAccount].filter(Boolean), inst: dossier.inst, dossierId: dossier.id, status: 'AT_LARGE', ...genTelemetry(dossier.suspectPhone, ts) }, ...next.suspects]
  }
  next = log(next, { ts, actor, role: 'analyst', action: 'EVIDENCE_LINKED_TO_POLICE', details: `Dossier ${dossier.id} (suspect ${dossier.suspectPhone || 'n/a'}) linked to Police Evidence Locker as ${evId}` })
  return sys(next, { ts, level: 'INFO', source: 'ANALYST_HUB', type: 'EVIDENCE_SYNC', message: `${evId} synced to Federal Police evidence locker` })
}

function createOrder(s, { ts, actor, incidentId, target, severity, source, victimName, victimNid, warrantId }) {
  const id = `FRZ-${s.seq.order}`
  const order = { id, incidentId, inst: target.inst, gatewayCode: target.gatewayCode || instByName(target.inst)?.gatewayCode, account: target.account, holder: target.holder, amount: target.amount, severity, source, status: 'PENDING_EXECUTION', dispatchedAt: ts, dispatchedBy: actor, executedAt: null, executedBy: null, gatewayRef: null, ack: false, victimName: victimName || null, victimNid: victimNid || null, warrantId: warrantId || null }
  return [{ ...s, seq: { ...s.seq, order: s.seq.order + 1 }, orders: [order, ...s.orders], nodes: bumpNode(s.nodes, target.inst, 'requests') }, order]
}

export function reducer(s, a) {
  switch (a.type) {
    case 'HYDRATE': return a.state
    case 'RESET_DEMO': return createSeedState(a.ts)

    case 'LOG': return log(s, { ts: a.ts, actor: a.actor, role: a.role, action: a.action, details: a.details })

    // ------------------------------------------------------------ Analyst
    case 'INGEST_DOSSIER': {
      const id = `SUB-${s.seq.dossier}`
      const dossier = { ...a.dossier, id, date: a.ts, status: 'PENDING_ANALYST_REVIEW', incidentId: null }
      let n = { ...s, seq: { ...s.seq, dossier: s.seq.dossier + 1 }, dossiers: [dossier, ...s.dossiers] }
      n = log(n, { ts: a.ts, actor: a.actor, role: 'analyst', action: 'QUEUED_INCIDENT', details: `Report ${id} ingested via ${dossier.channel} (${dossier.inst}, ${fmtN(dossier.amount)}, ${dossier.files.length} artifacts)` })
      return sys(n, { ts: a.ts, level: 'INFO', source: 'ANALYST_HUB', type: 'THREAT_INGESTION', message: `${id} ingested through ${dossier.channel}` })
    }
    case 'VERIFY_FILE': {
      const dossier = s.dossiers.find((x) => x.id === a.dossierId)
      const file = dossier?.files[a.idx]
      if (!file) return s
      const computed = a.hash || (file.content != null ? sha256Hex(file.content) : file.sha256)
      const ok = computed === file.sha256
      const files = dossier.files.map((f, i) => (i === a.idx ? { ...f, verified: ok, integrityFailed: !ok } : f))
      const allOk = files.every((f) => f.verified)
      const updated = { ...dossier, files, status: allOk && dossier.status === 'PENDING_ANALYST_REVIEW' ? 'DOSSIER_VERIFIED' : dossier.status }
      let n = { ...s, dossiers: s.dossiers.map((x) => (x.id === dossier.id ? updated : x)) }
      if (!ok) {
        n = log(n, { ts: a.ts, actor: a.actor, role: 'analyst', action: 'VERIFY_EVIDENCE_FAILED', details: `SHA-256 MISMATCH on ${file.name} (${dossier.id}): expected ${file.sha256.slice(0, 16)}…, got ${computed.slice(0, 16)}…` })
        return sys(n, { ts: a.ts, level: 'WARN', source: 'ANALYST_HUB', type: 'EVIDENCE_TAMPER', message: `Hash mismatch on ${file.name} (${dossier.id})` })
      }
      n = log(n, { ts: a.ts, actor: a.actor, role: 'analyst', action: 'VERIFY_EVIDENCE', details: `SHA-256 verified artifact ${file.name} (${dossier.id}) = ${file.sha256.slice(0, 16)}…` })
      if (updated.status === 'DOSSIER_VERIFIED' && dossier.status !== 'DOSSIER_VERIFIED') n = linkEvidence(n, updated, a.ts, a.actor)
      return n
    }
    case 'VALIDATE_DOSSIER': {
      const d = s.dossiers.find((x) => x.id === a.dossierId)
      if (!d || d.status !== 'DOSSIER_VERIFIED') return s
      const incId = `INC-2026-${s.seq.incident}`
      const targets = [{ inst: d.inst, account: d.suspectAccount, holder: d.suspectHolder || 'Unknown (KYC pending)', amount: d.amount, gatewayCode: instByName(d.inst)?.gatewayCode, orderId: null }, ...(d.extraTargets || [])]
      const incident = { id: incId, risk: sevOf(targets.reduce((x, t) => x + t.amount, 0)), vector: d.vector, victim: d.victimName, createdAt: a.ts, dossierId: d.id, targets }
      let n = { ...s, seq: { ...s.seq, incident: s.seq.incident + 1 }, incidents: [incident, ...s.incidents], dossiers: s.dossiers.map((x) => (x.id === d.id ? { ...x, status: 'QUEUED_FOR_FREEZE', incidentId: incId } : x)) }
      return log(n, { ts: a.ts, actor: a.actor, role: 'analyst', action: 'VERIFY_DOSSIER', details: `Dossier ${d.id} verified and escalated to freeze queue as ${incId}` })
    }
    case 'DISPATCH_FREEZE': {
      const inc = s.incidents.find((x) => x.id === a.incidentId)
      if (!inc) return s
      let n = log(s, { ts: a.ts, actor: a.actor, role: 'analyst', action: 'ANALYST_PIN_VERIFIED', details: `Analyst PIN authenticated for ${inc.id} freeze dispatch` })
      n = { ...n, failures: { ...n.failures, analyst: 0 } }
      let targets = inc.targets
      a.idxs.forEach((idx) => {
        const t = targets[idx]
        if (!t || t.orderId) return
        if (!isReachable(n, t.inst)) {
          n = log(n, { ts: a.ts, actor: a.actor, role: 'analyst', action: 'DISPATCH_FAILED', details: `Gateway ${nodeFor(n, t.inst).id} is ISOLATED by Administrator — freeze for ${t.account} NOT transmitted` })
          n = sys(n, { ts: a.ts, level: 'CRIT', source: nodeFor(n, t.inst).id, type: 'API_GATEWAY_FAILURE', message: `Freeze dispatch for ${inc.id} rejected: node isolated` })
          return
        }
        let order
        ;[n, order] = createOrder(n, { ts: a.ts, actor: a.actor, incidentId: inc.id, target: t, severity: inc.risk, source: 'NDSIR Analyst Hub', victimName: inc.victim, victimNid: s.dossiers.find((x) => x.id === inc.dossierId)?.nationalId })
        targets = targets.map((x, i) => (i === idx ? { ...x, orderId: order.id } : x))
        n = log(n, { ts: a.ts, actor: a.actor, role: 'analyst', action: 'DISPATCH_API_GATEWAY', details: `Order ${order.id} → ${t.inst} [${order.gatewayCode}] account ${t.account} holder ${t.holder} ${fmtN(t.amount)} (PENDING_EXECUTION)` })
        n = sys(n, { ts: a.ts, level: 'INFO', source: nodeFor(n, t.inst)?.id || 'GATEWAY', type: 'API_GATEWAY_CALL', message: `Emergency freeze ${order.id} transmitted to ${t.inst}` })
      })
      return { ...n, incidents: n.incidents.map((x) => (x.id === inc.id ? { ...x, targets } : x)) }
    }

    // --------------------------------------------------------------- Bank
    case 'EXECUTE_FREEZE': {
      const o = s.orders.find((x) => x.id === a.orderId)
      if (!o || o.status !== 'PENDING_EXECUTION') return s
      if (!isReachable(s, o.inst)) {
        const n = log(s, { ts: a.ts, actor: a.actor, role: 'bank', action: 'EXECUTE_FAILED', details: `Order ${o.id}: gateway ${nodeFor(s, o.inst).id} ISOLATED — cannot commit freeze` })
        return sys(n, { ts: a.ts, level: 'CRIT', source: nodeFor(s, o.inst).id, type: 'API_GATEWAY_FAILURE', message: `Bank execution of ${o.id} blocked: node isolated` })
      }
      const latency = a.ts - o.dispatchedAt
      const ref = makeGatewayRef(o.inst, o.id + a.ts)
      const done = { ...o, status: 'FROZEN_SECURED', executedAt: a.ts, executedBy: a.actor, gatewayRef: ref, ack: true }
      const rec = { id: `REC-${s.seq.rec}`, orderId: o.id, account: o.account, holder: o.holder, amount: o.amount, inst: o.inst, victimName: o.victimName, victimNid: o.victimNid, gatewayRef: ref, heldAt: a.ts, status: 'ESCROW_HELD', receipt: null }
      let n = { ...s, failures: { ...s.failures, bank: 0 }, seq: { ...s.seq, rec: s.seq.rec + 1 }, orders: s.orders.map((x) => (x.id === o.id ? done : x)), recovery: [rec, ...s.recovery], nodes: bumpNode(s.nodes, o.inst, 'acks'),
        warrants: s.warrants.map((w) => (w.orderId === o.id ? { ...w, status: 'EXECUTED_ARCHIVED' } : w)) }
      n = logMany(n, [
        { ts: a.ts, actor: a.actor, role: 'bank', action: 'BANK_PIN_VERIFIED', details: `Dual-control PIN authenticated for ${o.id}` },
        { ts: a.ts, actor: a.actor, role: 'bank', action: 'EXECUTE_FREEZE', details: `Order ${o.id} frozen · ref ${ref} · ${o.account} (${o.holder}) ${fmtN(o.amount)} · latency ${Math.round(latency / 1000)}s (${latency <= SLA_TARGET_MS ? 'within SLA' : 'SLA BREACH'})` },
        { ts: a.ts, actor: a.actor, role: 'bank', action: 'ACK_TRANSMITTED', details: `ACK for ${o.id} (${ref}) returned to national command network` },
      ])
      return sys(n, { ts: a.ts, level: 'INFO', source: nodeFor(n, o.inst)?.id || 'GATEWAY', type: 'ACK_RECEIVED', message: `${o.inst} ACK ${ref} for ${o.id} in ${Math.round(latency / 1000)}s` })
    }
    case 'RESTORE_ORDER': {
      const o = s.orders.find((x) => x.id === a.orderId)
      if (!o || !['PENDING_EXECUTION', 'FROZEN_SECURED'].includes(o.status)) return s
      let n = { ...s, failures: { ...s.failures, bank: 0 }, orders: s.orders.map((x) => (x.id === o.id ? { ...x, status: 'RESTORED_FALSE_POSITIVE', restoredAt: a.ts, restoreReason: a.reason, ack: true } : x)), recovery: s.recovery.map((r) => (r.orderId === o.id && r.status === 'ESCROW_HELD' ? { ...r, status: 'RELEASED' } : r)) }
      n = log(n, { ts: a.ts, actor: a.actor, role: 'bank', action: 'RESTORE_ACCOUNT_FALSE_POSITIVE', details: `Order ${o.id} (${o.account}) cleared as false positive and restored to normal standing. Reason: ${a.reason}` })
      return sys(n, { ts: a.ts, level: 'WARN', source: nodeFor(n, o.inst)?.id || 'GATEWAY', type: 'FALSE_POSITIVE_RESTORE', message: `${o.id} restored — account ${o.account}` })
    }
    case 'ISSUE_RESTITUTION': {
      const r = s.recovery.find((x) => x.id === a.recId)
      if (!r || r.status !== 'ESCROW_HELD') return s
      const no = `RST-2026-${String(s.seq.rst).padStart(4, '0')}`
      const body = { no, recId: r.id, orderId: r.orderId, beneficiary: r.victimName, nid: r.victimNid, amount: r.amount, account: r.account, gatewayRef: r.gatewayRef, issuedAt: a.ts }
      const receipt = { ...body, hash: sha256Hex(JSON.stringify(body)) }
      receipt.sig = hmacSha256Hex(SIGNING_KEY, receipt.hash)
      let n = { ...s, seq: { ...s.seq, rst: s.seq.rst + 1 }, recovery: s.recovery.map((x) => (x.id === r.id ? { ...x, status: 'RESTITUTED', receipt } : x)) }
      return log(n, { ts: a.ts, actor: a.actor, role: 'bank', action: 'RESTITUTION_ISSUED', details: `Receipt ${no} issued: ${fmtN(r.amount)} restored to ${r.victimName || 'victim'} from ${r.account}` })
    }
    case 'PIN_FAILED': {
      const count = (s.failures[a.role] || 0) + 1
      let n = { ...s, failures: { ...s.failures, [a.role]: count } }
      n = log(n, { ts: a.ts, actor: a.actor, role: a.role, action: 'PIN_VERIFICATION_FAILED', details: `Invalid PIN entered for ${a.context} (attempt ${count})` })
      if (count % 3 === 0) {
        n = { ...n, seq: { ...n.seq, waf: n.seq.waf + 1 }, waf: [{ id: `WAF-${n.seq.waf}`, ts: a.ts, type: 'BRUTE_FORCE_LOGIN', severity: 'WARN', detail: `${count} consecutive invalid ${a.role} PINs from ${a.actor}`, srcIp: 'internal-session', action: 'FLAGGED', rule: 'NDSIR-PIN-GUARD' }, ...n.waf].slice(0, 200) }
        n = sys(n, { ts: a.ts, level: 'WARN', source: 'PIN_GUARD', type: 'PIN_BRUTE_FORCE', message: `${count} failed ${a.role} PIN attempts by ${a.actor}` })
      }
      return n
    }

    // ------------------------------------------------------------- Police
    case 'WARRANT_CREATE': {
      const id = `WAR-2026-${s.seq.warrant}`
      const w = { ...a.warrant, id, timestamp: a.ts, status: 'PENDING_JUDICIAL_SIGN', signature: null, signedAt: null, signedBy: null, servedAt: null, orderId: null }
      return log({ ...s, seq: { ...s.seq, warrant: s.seq.warrant + 1 }, warrants: [w, ...s.warrants] }, { ts: a.ts, actor: a.actor, role: 'police', action: 'WARRANT_DRAFTED', details: `Warrant ${id} drafted for ${w.targetEntity} and submitted for judicial signature` })
    }
    case 'WARRANT_SIGN': {
      const w = s.warrants.find((x) => x.id === a.id)
      if (!w || w.status !== 'PENDING_JUDICIAL_SIGN') return s
      const judge = w.judge && !/pending/i.test(w.judge) ? w.judge : a.actor
      const signed = { ...w, judge, status: 'RATIFIED_ACTIVE', signedAt: a.ts, signedBy: judge }
      signed.signature = signWarrantPayload(signed)
      let n = { ...s, failures: { ...s.failures, police: 0 }, warrants: s.warrants.map((x) => (x.id === w.id ? signed : x)) }
      return log(n, { ts: a.ts, actor: a.actor, role: 'police', action: 'WARRANT_SIGNED', details: `Warrant ${w.id} ratified · signature ${signed.signature.slice(0, 16)}…` })
    }
    case 'WARRANT_SERVE': {
      const w = s.warrants.find((x) => x.id === a.id)
      if (!w || w.status !== 'RATIFIED_ACTIVE' || !w.inst) return s
      if (!isReachable(s, w.inst)) {
        const n = log(s, { ts: a.ts, actor: a.actor, role: 'police', action: 'WARRANT_SERVICE_FAILED', details: `Warrant ${w.id}: gateway ${nodeFor(s, w.inst).id} ISOLATED` })
        return sys(n, { ts: a.ts, level: 'CRIT', source: nodeFor(s, w.inst).id, type: 'API_GATEWAY_FAILURE', message: `Warrant ${w.id} service failed: node isolated` })
      }
      let order
      let n
      ;[n, order] = createOrder(s, { ts: a.ts, actor: a.actor, incidentId: null, target: { inst: w.inst, account: w.targetEntity, holder: w.holder || 'Unknown', amount: w.amount || 0 }, severity: sevOf(w.amount || 0), source: 'Federal Police Warrant', warrantId: w.id })
      n = { ...n, warrants: n.warrants.map((x) => (x.id === w.id ? { ...x, status: 'SERVED_PENDING_EXECUTION', servedAt: a.ts, orderId: order.id } : x)) }
      n = log(n, { ts: a.ts, actor: a.actor, role: 'police', action: 'WARRANT_SERVED', details: `Warrant ${w.id} served on ${w.inst} → freeze order ${order.id} (PENDING_EXECUTION)` })
      return sys(n, { ts: a.ts, level: 'INFO', source: 'NODE-POLICE-WARRANT', type: 'WARRANT_SERVICE', message: `${w.id} served to ${w.inst} as ${order.id}` })
    }
    case 'WARRANT_VALIDATED': return log(s, { ts: a.ts, actor: a.actor, role: a.role, action: 'WARRANT_VALIDATION_CHECK', details: `Warrant ${a.id} signature check: ${a.valid ? 'VALID' : 'INVALID / TAMPERED'}` })
    case 'EVIDENCE_ACCESS': {
      const ev = s.evidence.find((x) => x.id === a.evidenceId)
      if (!ev) return s
      const n = { ...s, evidence: s.evidence.map((x) => (x.id === ev.id ? { ...x, custody: [...x.custody, { ts: a.ts, actor: a.actor, action: `OPENED ${a.file}` }] } : x)) }
      return log(n, { ts: a.ts, actor: a.actor, role: a.role, action: 'EVIDENCE_ACCESSED', details: `${ev.id}: opened ${a.file} (chain of custody updated)` })
    }
    case 'TASKFORCE_DISPATCH': {
      const sus = s.suspects.find((x) => x.id === a.suspectId)
      if (!sus) return s
      const tf = { id: `TF-${s.seq.tf}`, suspectId: sus.id, unit: a.unit, ts: a.ts, status: 'DISPATCHED', by: a.actor }
      const n = { ...s, seq: { ...s.seq, tf: s.seq.tf + 1 }, taskForce: [tf, ...s.taskForce], suspects: s.suspects.map((x) => (x.id === sus.id ? { ...x, status: 'TASK_FORCE_DISPATCHED' } : x)) }
      return log(n, { ts: a.ts, actor: a.actor, role: 'police', action: 'TASKFORCE_DISPATCHED', details: `${a.unit} dispatched to suspect ${sus.phone} (${sus.id}) as ${tf.id}` })
    }
    case 'TASKFORCE_UPDATE': {
      const sus = s.suspects.find((x) => x.id === a.suspectId)
      if (!sus) return s
      const n = { ...s, suspects: s.suspects.map((x) => (x.id === sus.id ? { ...x, status: a.status } : x)), taskForce: s.taskForce.map((t, i, arr) => (t.suspectId === sus.id && arr.findIndex((q) => q.suspectId === sus.id) === i ? { ...t, status: a.status } : t)) }
      return log(n, { ts: a.ts, actor: a.actor, role: 'police', action: `SUSPECT_${a.status}`, details: `Suspect ${sus.phone} (${sus.id}) status → ${a.status}` })
    }

    // -------------------------------------------------------------- Admin
    case 'NODE_ISOLATE': {
      const nd = s.nodes.find((x) => x.id === a.nodeId)
      if (!nd || nd.status === 'ISOLATED') return s
      let n = { ...s, nodes: s.nodes.map((x) => (x.id === nd.id ? { ...x, status: 'ISOLATED', prevStatus: x.status } : x)) }
      n = log(n, { ts: a.ts, actor: a.actor, role: 'admin', action: 'NODE_ISOLATED', details: `KILL SWITCH: ${nd.id} (${nd.name}) severed from the command network. Reason: ${a.reason}` })
      return sys(n, { ts: a.ts, level: 'CRIT', source: nd.id, type: 'NODE_ISOLATION', message: `${nd.name} isolated by ${a.actor}` })
    }
    case 'NODE_RESTORE': {
      const nd = s.nodes.find((x) => x.id === a.nodeId)
      if (!nd || nd.status !== 'ISOLATED') return s
      let n = { ...s, nodes: s.nodes.map((x) => (x.id === nd.id ? { ...x, status: x.prevStatus || 'ONLINE', prevStatus: undefined } : x)) }
      n = log(n, { ts: a.ts, actor: a.actor, role: 'admin', action: 'NODE_RESTORED', details: `${nd.id} (${nd.name}) re-integrated into the command network` })
      return sys(n, { ts: a.ts, level: 'INFO', source: nd.id, type: 'NODE_RESTORED', message: `${nd.name} restored by ${a.actor}` })
    }
    case 'GLOBAL_RESET': {
      let n = { ...s, epoch: s.epoch + 1, failures: { analyst: 0, bank: 0, police: 0 } }
      n = log(n, { ts: a.ts, actor: a.actor, role: 'admin', action: 'GLOBAL_SECURITY_RESET', details: `Global security reset #${n.epoch}: all institutional sessions invalidated, re-authentication required` })
      return sys(n, { ts: a.ts, level: 'CRIT', source: 'ADMIN_CONSOLE', type: 'GLOBAL_RESET', message: `Global security reset #${n.epoch} issued by ${a.actor}` })
    }
    case 'BLOCK_IP': {
      if (s.blocklist.includes(a.ip)) return s
      const n = { ...s, blocklist: [...s.blocklist, a.ip] }
      return log(n, { ts: a.ts, actor: a.actor, role: 'admin', action: 'WAF_IP_BLOCKED', details: `Source ${a.ip} added to permanent WAF blocklist` })
    }
    case 'USER_ACTION': {
      const u = s.users.find((x) => x.id === a.userId)
      if (!u) return s
      let upd = u
      let action
      let details
      if (a.op === 'suspend') { upd = { ...u, status: 'SUSPENDED' }; action = 'USER_SUSPENDED'; details = `${u.id} (${u.name}) suspended` }
      else if (a.op === 'reactivate') { upd = { ...u, status: 'ACTIVE' }; action = 'USER_REACTIVATED'; details = `${u.id} (${u.name}) reactivated` }
      else if (a.op === 'elevate') { if (u.tier >= 5) return s; upd = { ...u, tier: u.tier + 1 }; action = 'CLEARANCE_ELEVATED'; details = `${u.id} (${u.name}) clearance Tier ${u.tier} → Tier ${upd.tier}` }
      else if (a.op === 'demote') { if (u.tier <= 1) return s; upd = { ...u, tier: u.tier - 1 }; action = 'CLEARANCE_REDUCED'; details = `${u.id} (${u.name}) clearance Tier ${u.tier} → Tier ${upd.tier}` }
      else if (a.op === 'audit') { upd = { ...u, lastAudit: a.ts }; action = 'USER_ACCESS_AUDITED'; details = `Access review completed for ${u.id} (${u.name})` }
      else return s
      return log({ ...s, users: s.users.map((x) => (x.id === u.id ? upd : x)) }, { ts: a.ts, actor: a.actor, role: 'admin', action, details })
    }
    case 'USER_PROVISION': {
      if (s.users.some((x) => x.id === a.user.id)) return s
      return log({ ...s, users: [{ ...a.user, status: 'ACTIVE', lastAudit: null }, ...s.users] }, { ts: a.ts, actor: a.actor, role: 'admin', action: 'USER_PROVISIONED', details: `${a.user.id} (${a.user.name}) provisioned as ${a.user.role}, Tier ${a.user.tier}` })
    }
    case 'TICK': {
      let n = { ...s, nodes: s.nodes.map((nd) => (nd.status === 'ISOLATED' ? { ...nd, history: [...nd.history.slice(-19), 0], latency: 0 } : { ...nd, latency: a.latency[nd.id] ?? nd.latency, history: [...nd.history.slice(-19), a.latency[nd.id] ?? nd.latency] })) }
      if (a.waf) n = { ...n, seq: { ...n.seq, waf: n.seq.waf + 1 }, waf: [{ ...a.waf, id: `WAF-${n.seq.waf}`, action: n.blocklist.includes(a.waf.srcIp) ? 'DROPPED (BLOCKLIST)' : 'BLOCKED' }, ...n.waf].slice(0, 200) }
      return n
    }
    default: return s
  }
}
