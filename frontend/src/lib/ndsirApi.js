// src/lib/ndsirApi.js
// Bridge between the Django backend (real citizen reports) and the NdsirContext command-network
// store the portals render from. Backend IncidentReport -> NdsirContext dossier.
import axiosClient from '../api/axiosClient'

const INCIDENT_TYPE_LABELS = {
  VOICE_SCAM: 'Voice Call Scam / Impersonation',
  PHISHING: 'Phishing Link / Malicious App',
  MOBILE_BANKING_FRAUD: 'Mobile Banking / Wallet Fraud',
  SMS_IMPERSONATION: 'SMS Impersonation (Fake Bank Message)',
  SIM_SWAP: 'SIM Swap Fraud',
  OTHER: 'Other / Unclassified',
}
const CHANNEL_LABELS = { WEB: 'Citizen Web Portal', TELEGRAM: 'Telegram Bot', IVR: 'IVR Phone Line' }
const FILE_KINDS = { IMAGE: 'image', AUDIO: 'audio', DOCUMENT: 'document', OTHER: 'data' }

// The four institutions the command network has gateways for (ndsirStore INSTITUTIONS).
const DEFAULT_INST = 'Commercial Bank of Ethiopia'
function matchInstitution(text = '') {
  if (/telebirr|ethio\s*telecom/i.test(text)) return 'Telebirr P2P'
  if (/awash/i.test(text)) return 'Awash Bank'
  if (/abyssinia|\bboa\b/i.test(text)) return 'Bank of Abyssinia'
  if (/\bcbe\b|commercial bank/i.test(text)) return 'Commercial Bank of Ethiopia'
  return null
}

// The backend appends a server-built [NDSIR-INTAKE] block (amount, transaction id, banks) to the
// description. Use the LAST block so text typed by the citizen can't spoof it.
const OPEN = '[NDSIR-INTAKE]'
const CLOSE = '[/NDSIR-INTAKE]'
function splitDescription(description = '') {
  const start = description.lastIndexOf(OPEN)
  const end = description.lastIndexOf(CLOSE)
  if (start === -1 || end === -1 || end < start) return { narrative: description.trim(), meta: {} }
  const meta = {}
  description.slice(start + OPEN.length, end).trim().split('\n').forEach((line) => {
    const i = line.indexOf('=')
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  })
  return { narrative: description.slice(0, start).trim(), meta }
}

export function mapIncidentToDossier(inc) {
  const victim = inc.victim || {}
  const { narrative, meta } = splitDescription(inc.description)

  // TODO(backend): IncidentReport has no `amount` column yet. We read it from the intake block when
  // the citizen supplied one, otherwise 0. Replace with inc.amount once the field exists.
  const amount = Number(meta.amount_etb) || 0

  const matched = matchInstitution(meta.target_platform) || matchInstitution(inc.scammer_identifier)
  const routingNote = matched || !meta.target_platform
    ? ''
    : `\n\n[Routing] Suspect platform "${meta.target_platform}" has no gateway in this network; defaulted to ${DEFAULT_INST} — analyst must confirm.`

  const files = (inc.evidence_files || []).map((f) => ({
    name: f.original_filename,
    size: '—',
    kind: FILE_KINDS[f.file_type] || 'data',
    preview: `Citizen-uploaded ${String(f.file_type || 'file').toLowerCase()}. SHA-256 recorded by the server at upload.`,
    sha256: f.file_hash_sha256,
    url: f.display_url || null,
    verified: false,
  }))

  return {
    id: inc.tracking_code,
    incidentId: inc.id, // note: the store resets incidentId to null on ingest (it means "freeze incident"), so the backend UUID is also kept as backendId
    backendId: inc.id,
    victimName: victim.full_name || inc.victim_name || 'Unknown reporter',
    nationalId: victim.fayda_id_hash ? `HASH-${victim.fayda_id_hash.slice(0, 12)}` : 'Not provided',
    phone: victim.phone_number || '',
    inst: matched || DEFAULT_INST,
    amount,
    vector: INCIDENT_TYPE_LABELS[inc.incident_type] || INCIDENT_TYPE_LABELS.OTHER,
    channel: CHANNEL_LABELS[inc.channel] || inc.channel,
    suspectAccount: inc.scammer_identifier || 'Unknown',
    suspectHolder: '',
    suspectPhone: inc.scammer_phone_number || '',
    statement: (narrative || 'No narrative provided.') + routingNote,
    files,
    date: inc.created_at ? new Date(inc.created_at).getTime() : Date.now(),
    status: 'PENDING_ANALYST_REVIEW',
  }
}

const MAX_PAGES = 4 // 4 x PAGE_SIZE(25) newest pending reports per sync

/** GET /incidents/reports/ (analyst/auditor JWT required). Handles paginated {results,next} or a raw array. */
export async function fetchBackendDossiers() {
  const out = []
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { data } = await axiosClient.get('/incidents/reports/', {
      params: { status: 'PENDING', ordering: '-created_at', page },
      skipAuthRedirect: true, // background poll: never redirect/wipe state from here
    })
    if (Array.isArray(data)) return data.map(mapIncidentToDossier)
    out.push(...(data?.results || []).map(mapIncidentToDossier))
    if (!data?.next) break
  }
  return out
}
