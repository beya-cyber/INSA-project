import { INCIDENT_STATUS_META } from '../../lib/constants'

// Maps our tone vocabulary to the new semantic status colors.
const TONE_TO_PILL = {
  amber: 'pill-warning',
  signal: 'pill-brand',
  critical: 'pill-danger',
  verified: 'pill-success',
  fog: 'pill-neutral',
}

/**
 * `metaMap` defaults to incident-report statuses but can be swapped for
 * ORDER_STATUS_META (or any other {STATUS: {label, tone}} map) so this
 * one component covers every status lifecycle in the system instead of
 * each page inventing its own workaround.
 */
export default function StatusBadge({ status, metaMap = INCIDENT_STATUS_META }) {
  const meta = metaMap[status] || { label: status, tone: 'fog' }
  return <span className={TONE_TO_PILL[meta.tone]}>{meta.label}</span>
}
