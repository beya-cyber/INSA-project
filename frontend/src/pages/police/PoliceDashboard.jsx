// src/pages/police/PoliceDashboard.jsx
// Law Enforcement portal — legal investigation & interception hub.
//  * Warrant Dispatch Center: draft → judicial PIN signature (HMAC) → serve to bank (creates a live
//    freeze order in the Bank queue) → auto-archived when the bank executes.
//  * Suspect Telemetry Matrix: IPDR, device fingerprints/IMEI, cell-tower pings per linked suspect.
//  * Evidence Locker: dossiers verified by analysts arrive here automatically.
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Shield, FileText, CheckCircle2, Search, Scale, Send, UserCheck, Radar, Archive, Play, Pause, Plus, Siren, FileSearch, Fingerprint, Smartphone, MapPin } from 'lucide-react'
import { useNdsir } from '../../context/NdsirContext'
import { INSTITUTIONS, PINS, validateWarrantSignature } from '../../store/ndsirStore'
import { etb, fmtDateTime, fmtTime, shortHash } from '../../lib/format'
import { sha256Bytes, sha256Hex } from '../../lib/sha256'
import { PortalShell, PortalHeader, FlashBanner, useFlash, Panel, PanelTitle, StatCard, Pill, Btn, Mono, Empty, Modal, PinModal, Field, inputCls } from '../../components/portal/ui'

const LEGAL_REFS = ['Cybercrime Proclamation 1185/2020 Art. 24', 'Criminal Procedure Code Art. 32', 'Anti-Money Laundering Proclamation']
const UNITS = ['Task Force Alpha — Cyber Division', 'Task Force Bravo — Financial Crimes', 'Rapid Response Unit — Bole Sub-city']
const BLANK = { caseTitle: '', investigator: 'Inspector Dawit M. (Federal Police Cyber Division)', judge: 'Pending Court Assignment', inst: INSTITUTIONS[0].name, targetEntity: '', holder: '', amount: '', legalRef: LEGAL_REFS[0], evidenceId: '' }

function Waveform({ seed, progress }) {
  const bytes = useMemo(() => sha256Bytes(seed), [seed])
  const bars = Array.from({ length: 48 }, (_, i) => 6 + (bytes[i % 32] % 26))
  return (
    <svg viewBox="0 0 96 36" className="w-full h-16" preserveAspectRatio="none">
      {bars.map((h, i) => <rect key={i} x={i * 2} y={18 - h / 2} width="1.2" height={h} rx="0.5" fill={i / bars.length < progress ? '#fb7185' : '#334155'} />)}
    </svg>
  )
}

export default function PoliceDashboard() {
  const { state, actions } = useNdsir()
  const [flashMsg, flash] = useFlash()
  const [tab, setTab] = useState('warrants')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [newOpen, setNewOpen] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [formError, setFormError] = useState(null)
  const [signFor, setSignFor] = useState(null)
  const [validateId, setValidateId] = useState('')
  const [validateSig, setValidateSig] = useState('')
  const [validateResult, setValidateResult] = useState(null)
  const [unit, setUnit] = useState(UNITS[0])
  const [susId, setSusId] = useState(state.suspects[0]?.id || null)
  const [evId, setEvId] = useState(state.evidence[0]?.id || null)
  const [fileIdx, setFileIdx] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [rehash, setRehash] = useState(null)
  const timer = useRef(null)

  const warrants = state.warrants.filter((w) => (statusFilter === 'ALL' || w.status === statusFilter) && [w.caseTitle, w.id, w.targetEntity].some((x) => x.toLowerCase().includes(search.toLowerCase())))
  const suspect = state.suspects.find((x) => x.id === susId) || state.suspects[0]
  const ev = state.evidence.find((x) => x.id === evId) || state.evidence[0]
  const file = ev && fileIdx != null ? ev.files[fileIdx] : null
  const count = (st) => state.warrants.filter((w) => w.status === st).length

  useEffect(() => {
    if (!playing) return undefined
    timer.current = setInterval(() => setProgress((p) => { if (p >= 1) { setPlaying(false); return 0 } return Math.min(1, p + 0.04) }), 400)
    return () => clearInterval(timer.current)
  }, [playing])
  useEffect(() => { setPlaying(false); setProgress(0); setRehash(null) }, [evId, fileIdx])

  const openFile = (i) => { setFileIdx(i); actions.accessEvidence(ev.id, ev.files[i].name) }
  const draftFrom = (e) => { setForm({ ...BLANK, caseTitle: `Asset seizure — ${e.dossierId}`, inst: e.inst, targetEntity: e.suspectAccount || '', holder: state.suspects.find((s) => s.phone === e.suspectPhone)?.alias || '', amount: String(e.amount), evidenceId: e.id }); setFormError(null); setNewOpen(true) }
  const submitWarrant = (e) => {
    e.preventDefault()
    const amount = Number(String(form.amount).replace(/,/g, ''))
    if (!form.caseTitle.trim() || !form.targetEntity.trim()) return setFormError('Case title and target account are required.')
    if (!amount || amount <= 0) return setFormError('Enter the amount to be seized (ETB).')
    actions.createWarrant({ caseTitle: form.caseTitle.trim(), investigator: form.investigator, judge: form.judge, inst: form.inst, targetEntity: form.targetEntity.trim(), holder: form.holder.trim() || 'Unknown', amount, legalRef: form.legalRef, evidenceId: form.evidenceId || null })
    setNewOpen(false); setForm(BLANK)
    flash('Electronic warrant drafted and routed to the magistrate for cryptographic signature.')
  }
  const runValidation = (id, sig) => {
    const w = state.warrants.find((x) => x.id === id.trim())
    const valid = validateWarrantSignature(w, sig)
    actions.validateWarrant(id.trim(), sig)
    setValidateResult({ id: id.trim(), valid, found: !!w })
  }

  const tabs = [
    { id: 'warrants', label: 'Warrant Dispatch Center', icon: Scale, count: state.warrants.length },
    { id: 'telemetry', label: 'Suspect Telemetry Matrix', icon: Radar, count: state.suspects.length },
    { id: 'locker', label: 'Evidence Locker', icon: Archive, count: state.evidence.length },
  ]

  return (
    <PortalShell>
      <PortalHeader accent="rose" icon={Shield} kicker="FEDERAL POLICE & JUDICIAL COMMAND" title="Legal Investigation & Interception Hub" tabs={tabs} active={tab} onTab={setTab}
        right={<Btn accent="rose" onClick={() => { setForm(BLANK); setFormError(null); setNewOpen(true) }}><Plus className="h-3.5 w-3.5" /> New Warrant Request</Btn>} />
      <FlashBanner accent="rose">{flashMsg}</FlashBanner>

      <main className="max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="Ratified / Active" value={count('RATIFIED_ACTIVE') + count('SERVED_PENDING_EXECUTION')} icon={Shield} sub="Enforceable now" />
          <StatCard label="Pending Ratification" value={count('PENDING_JUDICIAL_SIGN')} tone="text-amber-400" icon={Scale} sub="Awaiting magistrate signature" />
          <StatCard label="Executed & Archived" value={count('EXECUTED_ARCHIVED')} tone="text-emerald-400" icon={CheckCircle2} sub="Bank confirmed seizure" />
          <StatCard label="Evidence in Locker" value={state.evidence.length} icon={Archive} sub="Synced from analyst dossiers" />
        </div>

        {tab === 'warrants' && (
          <>
            <Panel>
              <PanelTitle accent="rose" icon={Scale} title="Electronic Warrants" sub="Draft → magistrate PIN signature → serve on institution → auto-archive on bank execution"
                right={
                  <div className="flex flex-col md:flex-row gap-2">
                    <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by ID, case, target…" className={`${inputCls('rose')} pl-9 md:w-64`} /></div>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputCls('rose')}>
                      <option value="ALL">All Statuses</option><option value="PENDING_JUDICIAL_SIGN">Pending Judicial Sign</option><option value="RATIFIED_ACTIVE">Ratified Active</option><option value="SERVED_PENDING_EXECUTION">Served — awaiting bank</option><option value="EXECUTED_ARCHIVED">Executed & Archived</option>
                    </select>
                  </div>
                } />
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead><tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider"><th className="py-3 px-4">Warrant</th><th className="py-3 px-4">Case & Target</th><th className="py-3 px-4">Investigator & Judge</th><th className="py-3 px-4">Legal Basis</th><th className="py-3 px-4">Status</th><th className="py-3 px-4 text-right">Actions</th></tr></thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {warrants.length === 0 && <tr><td colSpan={6}><Empty>No warrants match.</Empty></td></tr>}
                    {warrants.map((w) => (
                      <tr key={w.id} className="hover:bg-slate-900/60 align-top">
                        <td className="py-4 px-4"><span className="font-bold text-white block">{w.id}</span><span className="text-[10px] text-slate-500">{fmtDateTime(w.timestamp)}</span></td>
                        <td className="py-4 px-4"><span className="text-rose-400 font-semibold block">{w.caseTitle}</span><span className="font-mono text-slate-300">{w.targetEntity}</span>{w.inst && <span className="block text-[10px] text-slate-500">{w.inst} · {etb(w.amount)}</span>}</td>
                        <td className="py-4 px-4"><span className="text-slate-200 block text-[11px]">{w.investigator}</span><span className="text-[10px] text-slate-400 block">Judge: {w.judge}</span>{w.signature && <Mono>sig {shortHash(w.signature, 14, 6)}</Mono>}</td>
                        <td className="py-4 px-4 text-[11px] text-slate-400">{w.legalRef}</td>
                        <td className="py-4 px-4"><Pill status={w.status} pulse />{w.orderId && <p className="text-[10px] text-slate-500 mt-1">Bank order {w.orderId}</p>}</td>
                        <td className="py-4 px-4 text-right"><div className="flex flex-col items-end gap-1.5">
                          {w.status === 'PENDING_JUDICIAL_SIGN' && <Btn accent="rose" onClick={() => setSignFor(w)}><UserCheck className="h-3.5 w-3.5" /> Judicial Sign</Btn>}
                          {w.status === 'RATIFIED_ACTIVE' && w.inst && <Btn accent="rose" onClick={() => { actions.serveWarrant(w.id); flash(`Warrant ${w.id} served on ${w.inst}. Freeze order is now live in the Bank priority queue.`) }}><Send className="h-3.5 w-3.5" /> Serve on {INSTITUTIONS.find((i) => i.name === w.inst)?.short}</Btn>}
                          {w.signature && <Btn variant="ghost" onClick={() => { setValidateId(w.id); setValidateSig(w.signature); runValidation(w.id, w.signature) }}><FileSearch className="h-3.5 w-3.5" /> Validate</Btn>}
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Panel>
                <PanelTitle accent="rose" icon={FileSearch} title="Secure Warrant Validation Check" sub="Verify a warrant's HMAC-SHA256 signature — used by banks and auditors before honouring a seizure" />
                <div className="space-y-3 text-xs">
                  <Field label="Warrant ID"><input className={inputCls('rose')} value={validateId} onChange={(e) => setValidateId(e.target.value)} placeholder="WAR-2026-449" /></Field>
                  <Field label="Signature (hex)"><input className={`${inputCls('rose')} font-mono`} value={validateSig} onChange={(e) => setValidateSig(e.target.value)} /></Field>
                  <Btn accent="rose" onClick={() => runValidation(validateId, validateSig)}>Run Validation</Btn>
                  {validateResult && <div className={`p-3 rounded-xl border text-[11px] font-bold ${validateResult.valid ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400' : 'bg-rose-950/60 border-rose-500/40 text-rose-400'}`}>{!validateResult.found ? `No warrant ${validateResult.id} on record.` : validateResult.valid ? `✔ ${validateResult.id}: signature VALID — warrant is authentic and unaltered.` : `✘ ${validateResult.id}: signature INVALID or warrant altered.`}</div>}
                </div>
              </Panel>

              <Panel>
                <PanelTitle accent="rose" icon={Siren} title="Task Force Dispatch & Apprehension Tracking" sub="Dispatch units to suspects identified from analyst dossiers" />
                <div className="space-y-3 text-xs">
                  <select className={inputCls('rose')} value={unit} onChange={(e) => setUnit(e.target.value)}>{UNITS.map((u) => <option key={u}>{u}</option>)}</select>
                  {state.suspects.length === 0 && <Empty>No suspects linked yet.</Empty>}
                  {state.suspects.map((s) => (
                    <div key={s.id} className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
                      <div className="flex justify-between items-center"><div><p className="font-bold text-white">{s.alias} <span className="font-mono text-slate-400">{s.phone}</span></p><p className="text-[10px] text-slate-500">{s.id} · {s.inst}</p></div><Pill status={s.status} /></div>
                      <div className="flex flex-wrap gap-2">
                        {s.status === 'AT_LARGE' && <Btn accent="rose" onClick={() => { actions.dispatchTaskForce(s.id, unit); flash(`${unit} dispatched to ${s.phone}.`) }}><Siren className="h-3.5 w-3.5" /> Dispatch</Btn>}
                        {s.status === 'TASK_FORCE_DISPATCHED' && <Btn variant="ghost" onClick={() => actions.updateTaskForce(s.id, 'EN_ROUTE')}>Mark En Route</Btn>}
                        {['TASK_FORCE_DISPATCHED', 'EN_ROUTE'].includes(s.status) && <><Btn variant="ok" onClick={() => { actions.updateTaskForce(s.id, 'APPREHENDED'); flash(`Suspect ${s.phone} apprehended.`) }}>Mark Apprehended</Btn><Btn variant="danger" onClick={() => actions.updateTaskForce(s.id, 'ESCAPED')}>Suspect Escaped</Btn></>}
                        {s.status === 'ESCAPED' && <Btn accent="rose" onClick={() => actions.dispatchTaskForce(s.id, unit)}>Re-dispatch</Btn>}
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-slate-800 pt-2 space-y-1">
                    <p className="text-[11px] text-slate-400 font-bold uppercase">Dispatch log</p>
                    {state.taskForce.length === 0 ? <p className="text-[11px] text-slate-600 italic">No dispatches yet.</p> : state.taskForce.map((t) => <p key={t.id} className="text-[11px] text-slate-400"><span className="text-rose-300 font-mono">{t.id}</span> {fmtTime(t.ts)} · {t.unit} → {t.suspectId} · <span className="text-slate-200">{t.status}</span></p>)}
                  </div>
                </div>
              </Panel>
            </div>
          </>
        )}

        {tab === 'telemetry' && (
          <Panel>
            <PanelTitle accent="rose" icon={Radar} title="Suspect Telemetry Matrix" sub="IPDR sessions, device fingerprints and cell-tower pings for suspects linked from analyst dossiers (simulated carrier feed)" />
            {state.suspects.length === 0 ? <Empty>No suspects linked yet. Verify a dossier in the Analyst Hub to link one.</Empty> : (
              <div className="space-y-5">
                <div className="flex flex-wrap gap-2">{state.suspects.map((s) => <button key={s.id} onClick={() => setSusId(s.id)} className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${suspect?.id === s.id ? 'bg-rose-950 text-rose-300 border border-rose-500/50' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'}`}>{s.phone}</button>)}</div>
                {suspect && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3"><p className="text-slate-500 text-[10px] uppercase">Subject</p><p className="text-white font-bold">{suspect.alias}</p><p className="font-mono text-rose-300">{suspect.phone}</p></div>
                      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3"><p className="text-slate-500 text-[10px] uppercase">Linked accounts</p><p className="font-mono text-white">{suspect.accounts.join(', ') || '—'}</p><p className="text-[10px] text-slate-500">{suspect.inst} · dossier {suspect.dossierId}</p></div>
                      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3"><p className="text-slate-500 text-[10px] uppercase">Apprehension status</p><div className="mt-1"><Pill status={suspect.status} /></div></div>
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                      <div className="space-y-2"><h3 className="text-xs font-bold text-white uppercase flex items-center gap-2"><Radar className="h-4 w-4 text-rose-400" /> IPDR Session Log</h3>
                        <div className="overflow-x-auto"><table className="w-full text-[11px] text-left"><thead><tr className="text-slate-500 border-b border-slate-800"><th className="py-2 pr-3">Time</th><th className="pr-3">Source IP</th><th className="pr-3">Destination</th><th className="pr-3">Bytes</th><th>Cell</th></tr></thead>
                          <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">{suspect.ipdr.map((r, i) => <tr key={i}><td className="py-1.5 pr-3">{fmtTime(r.ts)}</td><td className="pr-3">{r.srcIp}</td><td className="pr-3">{r.dstIp}:{r.port}</td><td className="pr-3">{r.bytes.toLocaleString()}</td><td>{r.cell}</td></tr>)}</tbody></table></div></div>
                      <div className="space-y-2"><h3 className="text-xs font-bold text-white uppercase flex items-center gap-2"><MapPin className="h-4 w-4 text-rose-400" /> Cell-Tower Pings</h3>
                        <div className="overflow-x-auto"><table className="w-full text-[11px] text-left"><thead><tr className="text-slate-500 border-b border-slate-800"><th className="py-2 pr-3">Time</th><th className="pr-3">Tower</th><th className="pr-3">Area</th><th className="pr-3">Lat, Lon</th><th>Signal</th></tr></thead>
                          <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">{suspect.towers.map((r, i) => <tr key={i}><td className="py-1.5 pr-3">{fmtTime(r.ts)}</td><td className="pr-3">{r.towerId}</td><td className="pr-3">{r.area}</td><td className="pr-3">{r.lat.toFixed(3)}, {r.lon.toFixed(3)}</td><td>{r.signal} dBm</td></tr>)}</tbody></table></div></div>
                    </div>
                    <div className="space-y-2"><h3 className="text-xs font-bold text-white uppercase flex items-center gap-2"><Smartphone className="h-4 w-4 text-rose-400" /> Device Fingerprints</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{suspect.devices.map((d) => <div key={d.imei} className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 text-xs space-y-1"><p className="text-white font-bold">{d.model}</p><p className="font-mono text-rose-300 flex items-center gap-1"><Fingerprint className="h-3.5 w-3.5" /> IMEI {d.imei}</p><p className="text-[10px] text-slate-500">First seen {fmtDateTime(d.firstSeen)} · last seen {fmtTime(d.lastSeen)}</p><p className="text-[10px] text-slate-400">Linked MSISDNs: {d.linkedMsisdns.join(' · ')}</p></div>)}</div></div>
                  </>
                )}
              </div>
            )}
          </Panel>
        )}

        {tab === 'locker' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Panel className="lg:col-span-1">
              <PanelTitle accent="rose" icon={Archive} title="Evidence Locker" sub="Auto-linked from verified analyst dossiers" />
              {state.evidence.length === 0 && <Empty>No evidence synced yet.</Empty>}
              {state.evidence.map((e) => (
                <button key={e.id} onClick={() => { setEvId(e.id); setFileIdx(null) }} className={`w-full text-left rounded-xl border p-3 text-xs space-y-1 cursor-pointer ${ev?.id === e.id ? 'border-rose-500/60 bg-rose-950/20' : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'}`}>
                  <div className="flex justify-between"><span className="font-bold text-rose-300">{e.id}</span><span className="text-[10px] text-slate-500">{fmtDateTime(e.linkedAt)}</span></div>
                  <p className="text-white">{e.victimName} <span className="text-slate-500 font-mono text-[10px]">{e.nationalId}</span></p>
                  <p className="text-slate-400 font-mono text-[11px]">Suspect {e.suspectPhone || 'n/a'} · {e.suspectAccount}</p>
                  <p className="text-[10px] text-slate-500">{e.files.length} artifacts · {e.dossierId} · {etb(e.amount)}</p>
                </button>
              ))}
            </Panel>

            <Panel className="lg:col-span-2">
              {!ev ? <Empty>Select evidence to inspect.</Empty> : (
                <>
                  <PanelTitle accent="rose" icon={FileText} title={`${ev.id} — ${ev.victimName}`} sub={`Dossier ${ev.dossierId} · suspect ${ev.suspectPhone || 'n/a'} · linked by ${ev.linkedBy}`} right={<Btn accent="rose" onClick={() => draftFrom(ev)}><Scale className="h-3.5 w-3.5" /> Draft Warrant</Btn>} />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      {ev.files.map((f, i) => (
                        <button key={i} onClick={() => openFile(i)} className={`w-full text-left p-2.5 rounded-xl border text-xs cursor-pointer ${fileIdx === i ? 'border-rose-500/60 bg-rose-950/20' : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'}`}>
                          <p className="text-rose-300 font-semibold truncate">{f.name}</p><p className="text-[10px] text-slate-500">{f.kind} · {f.size}</p>
                        </button>
                      ))}
                    </div>
                    <div className="md:col-span-2 bg-black/50 border border-slate-800 rounded-xl p-4 min-h-[220px] space-y-3 text-xs">
                      {!file ? <p className="text-slate-500 italic">Select an artifact to open it. Every open is written to the chain of custody and the audit trail.</p> : (
                        <>
                          <div className="flex justify-between items-center"><p className="text-white font-bold">{file.name}</p><Pill status={file.verified ? 'VERIFIED' : 'PENDING'} label={file.verified ? 'Hash verified' : 'Unverified'} /></div>
                          {file.kind === 'audio' && (
                            <div className="space-y-2"><Waveform seed={file.sha256} progress={progress} />
                              <div className="flex items-center gap-3"><button onClick={() => setPlaying((p) => !p)} className="p-2 rounded-full bg-rose-950 border border-rose-500/50 text-rose-300 cursor-pointer">{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button><span className="font-mono text-slate-400">{Math.round(progress * (file.durationSec || 60))}s / {file.durationSec || 60}s</span><span className="text-[10px] text-slate-600">simulated playback — audio bytes are not stored in this demo</span></div></div>
                          )}
                          {file.kind === 'image' && <div className="h-32 rounded-lg border border-dashed border-slate-700 flex items-center justify-center text-slate-500 text-[11px] text-center px-4">Image viewer — screenshot bytes are not retained in this demo store</div>}
                          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 text-slate-300 leading-relaxed whitespace-pre-wrap font-mono text-[11px]">{file.preview}</div>
                          <Mono>SHA-256 {file.sha256}</Mono>
                          <div className="flex items-center gap-2"><Btn variant="ghost" onClick={() => setRehash(file.content != null ? sha256Hex(file.content) === file.sha256 : null)}><Fingerprint className="h-3.5 w-3.5" /> Re-verify hash</Btn>{rehash === true && <span className="text-emerald-400 font-bold">✔ matches recorded hash</span>}{rehash === false && <span className="text-rose-400 font-bold">✘ MISMATCH</span>}{file.content == null && rehash == null && <span className="text-[10px] text-slate-600">sealed at ingestion; no stored bytes to re-hash</span>}</div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="border-t border-slate-800 pt-3"><p className="text-[11px] text-slate-400 font-bold uppercase mb-1">Chain of custody</p><div className="space-y-1 max-h-32 overflow-y-auto">{ev.custody.slice().reverse().map((c, i) => <p key={i} className="text-[11px] text-slate-400"><span className="font-mono text-slate-500">{fmtDateTime(c.ts)}</span> · {c.actor} · <span className="text-slate-200">{c.action}</span></p>)}</div></div>
                </>
              )}
            </Panel>
          </div>
        )}
      </main>

      <PinModal open={!!signFor} onClose={() => setSignFor(null)} accent="rose" title="Magistrate Digital Signature" demoPin={PINS.police} confirmLabel="Sign & Ratify Warrant"
        description={<>Ratifying <span className="text-white font-bold">{signFor?.id}</span> ({signFor?.caseTitle}) applies your cryptographic signature to the seizure order. Enter your 4-digit judicial PIN.</>}
        onConfirm={(pin) => { const r = actions.signWarrant(signFor.id, pin); if (r.ok) flash(`Warrant ${signFor.id} ratified and cryptographically signed.`); return r }} />

      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="New Electronic Warrant Request" icon={Scale} accent="rose" wide>
        <form onSubmit={submitWarrant} className="space-y-3 text-xs">
          <Field label="Case title"><input className={inputCls('rose')} value={form.caseTitle} onChange={(e) => setForm({ ...form, caseTitle: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Institution to serve"><select className={inputCls('rose')} value={form.inst} onChange={(e) => setForm({ ...form, inst: e.target.value })}>{INSTITUTIONS.map((i) => <option key={i.key}>{i.name}</option>)}</select></Field>
            <Field label="Target account / wallet"><input className={inputCls('rose')} value={form.targetEntity} onChange={(e) => setForm({ ...form, targetEntity: e.target.value })} /></Field>
            <Field label="Account holder"><input className={inputCls('rose')} value={form.holder} onChange={(e) => setForm({ ...form, holder: e.target.value })} /></Field>
            <Field label="Amount to seize (ETB)"><input className={inputCls('rose')} inputMode="numeric" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
            <Field label="Legal basis"><select className={inputCls('rose')} value={form.legalRef} onChange={(e) => setForm({ ...form, legalRef: e.target.value })}>{LEGAL_REFS.map((l) => <option key={l}>{l}</option>)}</select></Field>
            <Field label="Magistrate (optional)"><input className={inputCls('rose')} value={form.judge} onChange={(e) => setForm({ ...form, judge: e.target.value })} /></Field>
          </div>
          <Field label="Supporting evidence"><select className={inputCls('rose')} value={form.evidenceId} onChange={(e) => setForm({ ...form, evidenceId: e.target.value })}><option value="">— none —</option>{state.evidence.map((e) => <option key={e.id} value={e.id}>{e.id} · {e.victimName}</option>)}</select></Field>
          {formError && <p className="text-rose-400 text-[11px]">{formError}</p>}
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-800"><Btn variant="ghost" onClick={() => setNewOpen(false)}>Cancel</Btn><button type="submit" className="px-4 py-2 rounded-xl text-xs bg-rose-950 border border-rose-500/50 hover:bg-rose-900 text-rose-300 font-bold cursor-pointer">Submit for Judicial Signature</button></div>
        </form>
      </Modal>
    </PortalShell>
  )
}
