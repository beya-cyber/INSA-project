// src/components/portal/ui.jsx
// Shared building blocks for the five NDSIR portals. Visual language is lifted
// 1:1 from AnalystDashboard (dark #010409 shell, #070d1d panels, rounded-2xl,
// mono type, glow accents) so every portal reads as one system.
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Hash, Lock, Radio, X } from 'lucide-react'
import { useNdsir } from '../../context/NdsirContext'

export const ACCENTS = {
  cyan: { text: 'text-cyan-400', soft: 'text-cyan-300', line: 'border-cyan-500/20', icon: 'bg-cyan-950/80 border-cyan-500/50 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]', tab: 'bg-cyan-950 text-cyan-300 border border-cyan-500/50 shadow', chip: 'bg-cyan-950 border-cyan-500/40 text-cyan-300', primary: 'bg-cyan-950 border border-cyan-500/50 hover:bg-cyan-900 text-cyan-300', banner: 'bg-cyan-950 border-cyan-400 text-cyan-200 shadow-[0_0_30px_rgba(6,182,212,0.5)]', ring: 'focus:border-cyan-500', modal: 'border-cyan-500/60' },
  blue: { text: 'text-blue-400', soft: 'text-blue-300', line: 'border-blue-500/20', icon: 'bg-blue-950/80 border-blue-500/50 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)]', tab: 'bg-blue-950 text-blue-300 border border-blue-500/50 shadow', chip: 'bg-blue-950 border-blue-500/40 text-blue-300', primary: 'bg-blue-950 border border-blue-500/50 hover:bg-blue-900 text-blue-300', banner: 'bg-blue-950 border-blue-400 text-blue-200 shadow-[0_0_30px_rgba(59,130,246,0.5)]', ring: 'focus:border-blue-500', modal: 'border-blue-500/60' },
  rose: { text: 'text-rose-400', soft: 'text-rose-300', line: 'border-rose-500/20', icon: 'bg-rose-950/80 border-rose-500/50 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.3)]', tab: 'bg-rose-950 text-rose-300 border border-rose-500/50 shadow', chip: 'bg-rose-950 border-rose-500/40 text-rose-300', primary: 'bg-rose-950 border border-rose-500/50 hover:bg-rose-900 text-rose-300', banner: 'bg-rose-950 border-rose-400 text-rose-200 shadow-[0_0_30px_rgba(244,63,94,0.5)]', ring: 'focus:border-rose-500', modal: 'border-rose-500/60' },
  indigo: { text: 'text-indigo-400', soft: 'text-indigo-300', line: 'border-indigo-500/20', icon: 'bg-indigo-950/80 border-indigo-500/50 text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.3)]', tab: 'bg-indigo-950 text-indigo-300 border border-indigo-500/50 shadow', chip: 'bg-indigo-950 border-indigo-500/40 text-indigo-300', primary: 'bg-indigo-950 border border-indigo-500/50 hover:bg-indigo-900 text-indigo-300', banner: 'bg-indigo-950 border-indigo-400 text-indigo-200 shadow-[0_0_30px_rgba(99,102,241,0.5)]', ring: 'focus:border-indigo-500', modal: 'border-indigo-500/60' },
  amber: { text: 'text-amber-400', soft: 'text-amber-300', line: 'border-amber-500/20', icon: 'bg-amber-950/80 border-amber-500/50 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]', tab: 'bg-amber-950 text-amber-300 border border-amber-500/50 shadow', chip: 'bg-amber-950 border-amber-500/40 text-amber-300', primary: 'bg-amber-950 border border-amber-500/50 hover:bg-amber-900 text-amber-300', banner: 'bg-amber-950 border-amber-400 text-amber-200 shadow-[0_0_30px_rgba(245,158,11,0.5)]', ring: 'focus:border-amber-500', modal: 'border-amber-500/60' },
}

// ---- transient feedback banner ------------------------------------------------
export function useFlash() {
  const [msg, setMsg] = useState(null)
  const timer = useRef(null)
  const flash = useCallback((text, ms = 5000) => {
    setMsg(text)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setMsg(null), ms)
  }, [])
  useEffect(() => () => clearTimeout(timer.current), [])
  return [msg, flash]
}

export function FlashBanner({ accent = 'cyan', children }) {
  if (!children) return null
  return (
    <div className="max-w-7xl mx-auto mb-4">
      <div className={`px-5 py-3 border-2 rounded-2xl text-xs text-center font-black flex items-center justify-center gap-3 ${ACCENTS[accent].banner}`}>
        <Radio className="h-5 w-5 animate-spin" />
        <span>{children}</span>
      </div>
    </div>
  )
}

// ---- header + tabs --------------------------------------------------------------
export function PortalShell({ children }) {
  return <div className="min-h-screen bg-[#010409] text-slate-100 font-mono p-6 selection:bg-cyan-500 selection:text-black">{children}</div>
}

export function PortalHeader({ accent = 'cyan', icon: Icon, kicker, title, tabs, active, onTab, right }) {
  const navigate = useNavigate()
  const a = ACCENTS[accent]
  return (
    <header className={`max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between pb-6 border-b ${a.line} mb-6 gap-4`}>
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/staff/login')} title="Return to Portal Select" className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl hover:border-cyan-500 transition-all text-slate-400 hover:text-white cursor-pointer group shadow-lg">
          <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
        </button>
        <div className="flex items-center gap-3">
          <div className={`p-3 border rounded-2xl animate-pulse ${a.icon}`}><Icon className="h-7 w-7" /></div>
          <div>
            <p className={`text-[11px] tracking-widest uppercase font-bold ${a.text}`}>{kicker}</p>
            <h1 className="text-xl font-black text-white tracking-tight">{title}</h1>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <div className="flex flex-wrap items-center bg-[#070d1d] border border-slate-800 rounded-xl p-1 gap-1 shadow-xl">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => onTab(t.id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${active === t.id ? a.tab : 'text-slate-400 hover:text-white'}`}>
              {t.icon && <t.icon className="h-3.5 w-3.5" />} {t.label}{t.count != null ? ` (${t.count})` : ''}
            </button>
          ))}
        </div>
        {right}
      </div>
    </header>
  )
}

// ---- layout atoms -----------------------------------------------------------------
export const Panel = ({ children, className = '' }) => <div className={`bg-[#070d1d]/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 ${className}`}>{children}</div>

export function PanelTitle({ icon: Icon, title, sub, right, accent = 'cyan' }) {
  return (
    <div className="border-b border-slate-800 pb-3 flex flex-col md:flex-row justify-between md:items-center gap-2">
      <div>
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">{Icon && <Icon className={`h-4 w-4 ${ACCENTS[accent].text}`} />} {title}</h2>
        {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
      </div>
      {right}
    </div>
  )
}

export function StatCard({ label, value, sub, icon: Icon, tone = 'text-white', onClick, active }) {
  return (
    <div onClick={onClick} className={`bg-[#070d1d] border p-5 rounded-2xl shadow-xl ${onClick ? 'cursor-pointer' : ''} ${active ? 'border-cyan-500' : 'border-slate-800'}`}>
      <div className="flex justify-between items-center text-slate-400 mb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">{label}</span>
        {Icon && <Icon size={16} className="text-cyan-400" />}
      </div>
      <p className={`text-3xl font-black ${tone}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-500 mt-1">{sub}</p>}
    </div>
  )
}

const TONES = {
  amber: 'bg-amber-950/80 border border-amber-500/40 text-amber-400',
  rose: 'bg-rose-950/80 border border-rose-500/40 text-rose-400',
  emerald: 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-400',
  blue: 'bg-blue-950/80 border border-blue-500/40 text-blue-400',
  cyan: 'bg-cyan-950/80 border border-cyan-500/40 text-cyan-300',
  slate: 'bg-slate-900 border border-slate-700 text-slate-300',
}
const TONE_OF = {
  amber: ['PENDING', 'DISPATCHED', 'PARTIALLY', 'ESCROW_HELD', 'TASK_FORCE', 'EN_ROUTE', 'SUSPENDED', 'MEDIUM', 'DEGRADED', 'WARN'],
  rose: ['FROZEN', 'CRITICAL', 'ISOLATED', 'AT_LARGE', 'INVALID', 'FAILED', 'CRIT', 'ESCAPED'],
  emerald: ['ACK', 'VERIFIED', 'RESTITUTED', 'EXECUTED', 'ONLINE', 'SYNCED', 'ACTIVE', 'APPREHENDED', 'RESTORED', 'RELEASED', 'VALID', 'INFO', 'BLOCKED', 'DROPPED', 'FLAGGED'],
  blue: ['RATIFIED', 'SERVED', 'QUEUED'],
  cyan: ['HIGH'],
}
export function toneOf(status = '') {
  const s = String(status).toUpperCase()
  // order matters: PENDING_* must win over words it may contain
  for (const tone of ['amber', 'rose', 'emerald', 'blue', 'cyan']) if (TONE_OF[tone].some((k) => s.startsWith(k) || s.includes(k))) return tone
  return 'slate'
}
export function Pill({ status, label, pulse }) {
  const tone = toneOf(status)
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${TONES[tone]} ${pulse && tone === 'amber' ? 'animate-pulse' : ''}`}>{label || status}</span>
}

export const Mono = ({ children, className = '' }) => <span className={`font-mono text-[10px] text-slate-500 break-all ${className}`}>{children}</span>
export const Empty = ({ children }) => <p className="text-xs text-slate-500 italic py-6 text-center">{children}</p>

export function Btn({ accent = 'cyan', variant = 'primary', className = '', ...props }) {
  const base = 'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow disabled:opacity-40 disabled:cursor-not-allowed'
  const v = variant === 'primary' ? ACCENTS[accent].primary : variant === 'danger' ? 'bg-rose-950 border border-rose-500/50 hover:bg-rose-900 text-rose-300' : variant === 'ok' ? 'bg-emerald-950 border border-emerald-500/50 hover:bg-emerald-900 text-emerald-300' : 'bg-slate-800 hover:bg-slate-700 text-white'
  return <button type="button" className={`${base} ${v} ${className}`} {...props} />
}

export const inputCls = (accent = 'cyan') => `w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none ${ACCENTS[accent].ring}`
export function Field({ label, children }) {
  return <label className="block"><span className="block text-[11px] text-slate-400 mb-1 font-bold">{label}</span>{children}</label>
}

// ---- modals -----------------------------------------------------------------------
export function Modal({ open, onClose, title, icon: Icon, accent = 'cyan', wide, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-[60]" onClick={onClose}>
      <div className={`bg-[#070d1d] border rounded-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto ${wide ? 'max-w-2xl' : 'max-w-md'} ${ACCENTS[accent].modal}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${ACCENTS[accent].text}`}>{Icon && <Icon className="h-4 w-4" />} {title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

// 4-digit PIN gate. `onConfirm(pin)` returns {ok, error}; modal closes on ok.
const PIN_ROLE_BY_ACCENT = { cyan: 'analyst', blue: 'bank', rose: 'police' }

export function PinModal({ open, onClose, onConfirm, title, description, demoPin, confirmLabel = 'Confirm PIN', accent = 'cyan', role, children }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(null)
  // failed-PIN count for this role comes from the shared store (the reducer logs a brute-force WAF event on every 3rd)
  const { state } = useNdsir()
  const failures = state.failures?.[role || PIN_ROLE_BY_ACCENT[accent]] || 0
  const untilWaf = 3 - (failures % 3)
  useEffect(() => { if (open) { setPin(''); setError(null) } }, [open])
  const submit = (e) => {
    e.preventDefault()
    if (pin.length < 4) { setError('Please enter your valid 4-digit PIN.'); return }
    const res = onConfirm(pin)
    if (res && res.ok === false) { setError(res.error || 'Verification failed.'); setPin('') } else onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title={title} icon={Lock} accent={accent}>
      <form onSubmit={submit} className="space-y-4 text-xs">
        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl text-[11px] text-slate-400">{description}</div>
        {children}
        <div>
          <label className="block text-[11px] text-slate-400 mb-1 font-bold">Enter 4-Digit PIN</label>
          <div className="relative">
            <Hash className={`absolute left-3 top-2.5 h-4 w-4 ${ACCENTS[accent].text}`} />
            <input autoFocus type="password" inputMode="numeric" maxLength={4} placeholder="••••" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} className={`w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-white font-mono tracking-widest text-lg outline-none ${ACCENTS[accent].ring}`} />
          </div>
          {error && <p className="text-rose-400 text-[10px] mt-1">{error}</p>}
          <p className={`text-[10px] mt-2 ${failures ? 'text-rose-300' : 'text-slate-500'}`}>
            {failures > 0 && <span className="font-bold">Failed attempts: {failures}. </span>}
            3 failed attempts logs a brute-force WAF event{failures > 0 ? ` (${failures % 3 === 0 ? 'one was just logged' : `${untilWaf} more to trigger`})` : ''}.
          </p>
        </div>
        {demoPin && (
          <div className="flex items-center justify-between text-[11px] bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-400">Testing shortcut?</span>
            <button type="button" onClick={() => { setPin(demoPin); setError(null) }} className={`${ACCENTS[accent].text} hover:underline font-bold cursor-pointer`}>Auto-Fill PIN ({demoPin})</button>
          </div>
        )}
        <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs bg-slate-900 text-slate-300 hover:bg-slate-800 cursor-pointer">Cancel</button>
          <button type="submit" className="px-4 py-2 rounded-xl text-xs bg-rose-950 border border-rose-500/50 hover:bg-rose-900 text-rose-300 font-bold cursor-pointer shadow-lg flex items-center gap-1.5">{confirmLabel}</button>
        </div>
      </form>
    </Modal>
  )
}

// ---- small SVG charts (no chart-library dependency) --------------------------------
export function BarSpark({ data, height = 120, color = '#06b6d4', hotColor = '#f43f5e' }) {
  const max = Math.max(...data.map((d) => d.v), 1)
  const avg = data.reduce((a, d) => a + d.v, 0) / data.length
  const w = 100 / data.length
  return (
    <svg viewBox={`0 0 100 ${height / 4}`} className="w-full" style={{ height }} preserveAspectRatio="none" role="img" aria-label="24 hour freeze velocity">
      {data.map((d, i) => {
        const h = (d.v / max) * (height / 4 - 6)
        const hot = d.v > avg * 1.6
        return <rect key={i} x={i * w + 0.3} y={height / 4 - h - 1} width={w - 0.6} height={h} rx="0.6" fill={hot ? hotColor : color} opacity={hot ? 0.95 : 0.7}><title>{`${String(d.hour).padStart(2, '0')}:00 — ${d.v} freezes`}</title></rect>
      })}
    </svg>
  )
}

export function Sparkline({ values, color = '#22d3ee', width = 120, height = 28 }) {
  const max = Math.max(...values, 1)
  const pts = values.map((v, i) => `${(i / Math.max(values.length - 1, 1)) * width},${height - (v / max) * (height - 4) - 2}`).join(' ')
  return <svg width={width} height={height} className="shrink-0"><polyline fill="none" stroke={color} strokeWidth="1.5" points={pts} /></svg>
}
