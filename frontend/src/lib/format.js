// src/lib/format.js — shared formatting helpers for all five portals.

export const etb = (n) => `ETB ${Number(n || 0).toLocaleString('en-US')}`

const pad = (n) => String(n).padStart(2, '0')

export function fmtDateTime(ts) {
  const d = new Date(ts)
  return `${d.toLocaleString('en-US', { month: 'short' })} ${pad(d.getDate())}, ${d.getFullYear()} - ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export const fmtTime = (ts) => {
  const d = new Date(ts)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export const shortHash = (h, head = 10, tail = 6) =>
  !h ? '—' : h.length <= head + tail + 1 ? h : `${h.slice(0, head)}…${h.slice(-tail)}`

export function fmtDuration(ms) {
  if (ms == null) return '—'
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  return `${m}m ${pad(s % 60)}s`
}

// Gateway reference prefix per institution, e.g. CBE-SEC-482913
const PREFIX = { 'Commercial Bank of Ethiopia': 'CBE', 'Telebirr P2P': 'TBR', 'Awash Bank': 'AWS', 'Bank of Abyssinia': 'BOA' }
export const institutionPrefix = (inst) => PREFIX[inst] || 'GEN'

export function makeGatewayRef(inst, seed) {
  // Deterministic 6-digit number from a seed so the reducer stays pure.
  let n = 0
  for (let i = 0; i < seed.length; i++) n = (n * 31 + seed.charCodeAt(i)) % 1000000
  return `${institutionPrefix(inst)}-SEC-${String(n).padStart(6, '0')}`
}

export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
