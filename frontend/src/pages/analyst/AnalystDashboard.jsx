// src/pages/analyst/AnalystDashboard.jsx
// Fraud Analyst Hub — the ingestion & triage engine of the NDSIR command network.
// All state lives in the shared NDSIR store, so a dispatch made here appears in the
// Bank priority queue instantly and verified dossiers appear in the Police evidence locker.
import React, { useMemo, useState } from 'react'
import { ShieldAlert, FolderOpen, LayoutDashboard, FileText, TrendingUp, Download, History, CheckCircle, UserCheck, Eye, ShieldCheck, Users, Activity, ArrowUpRight, Send, Radio, Plus, Fingerprint, AlertTriangle } from 'lucide-react'
import { useNdsir, useNow } from '../../context/NdsirContext'
import { INSTITUTIONS, PINS, incidentStatus, velocitySeries, institutionShares, computeSla, isReachable, nodeFor, verifyChain } from '../../store/ndsirStore'
import { etb, fmtDateTime, fmtDuration, shortHash, downloadBlob } from '../../lib/format'
import { computeFileHash } from '../../lib/hashUtils'
import { sha256Hex } from '../../lib/sha256'
import { exportToCsv } from '../../lib/csvExport'
import { buildPdf } from '../../lib/pdfLite'
import { PortalShell, PortalHeader, FlashBanner, useFlash, Panel, PanelTitle, StatCard, Pill, Btn, Mono, Empty, Modal, PinModal, Field, inputCls, BarSpark } from '../../components/portal/ui'

const CHANNELS = ['Citizen Web Portal', 'Telegram Bot', 'IVR Hotline', 'SMS Short Code', 'Bank Referral API', 'Police Referral']
const SEG_COLORS = ['#06b6d4', '#a78bfa', '#10b981', '#f59e0b']
const EMPTY_FORM = { channel: CHANNELS[0], victimName: '', nationalId: '', phone: '', inst: INSTITUTIONS[0].name, amount: '', vector: '', suspectAccount: '', suspectHolder: '', suspectPhone: '', statement: '' }

export default function AnalystDashboard() {
  const { state, actions } = useNdsir()
  const now = useNow(5000)
  const [flashMsg, flash] = useFlash()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [instFilter, setInstFilter] = useState('all')
  const [dispatchFor, setDispatchFor] = useState(null) // incident being dispatched
  const [picked, setPicked] = useState([])
  const [dossierModal, setDossierModal] = useState(null) // dossier id
  const [highlightId, setHighlightId] = useState(null)
  const [ingestOpen, setIngestOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formFiles, setFormFiles] = useState([])
  const [formError, setFormError] = useState(null)
  const [busyHash, setBusyHash] = useState(null)

  const incidents = useMemo(() => state.incidents.map((i) => ({ ...i, status: incidentStatus(i, state.orders) })), [state.incidents, state.orders])
  const shown = incidents.filter((i) => instFilter === 'all' || i.targets.some((t) => t.inst.toLowerCase().includes(instFilter)))
  const velocity = velocitySeries(state, now)
  const shares = institutionShares(state)
  const sla = computeSla(state.orders, now)
  const activeQueue = incidents.filter((i) => ['PENDING_FREEZE', 'PARTIALLY_DISPATCHED', 'DISPATCHED'].includes(i.status)).length
  const ackRate = state.orders.length ? Math.round((state.orders.filter((o) => o.ack).length / state.orders.length) * 1000) / 10 : 100
  const frozenCount = state.orders.filter((o) => o.status === 'FROZEN_SECURED').length
  const chain = useMemo(() => verifyChain(state.audit), [state.audit])
  const analystLog = useMemo(() => state.audit.filter((e) => ['analyst', 'system'].includes(e.role) || ['EXECUTE_FREEZE', 'ACK_TRANSMITTED', 'EXECUTE_FAILED'].includes(e.action)).slice().reverse(), [state.audit])
  const selShare = shares.find((s) => s.key === instFilter)
  const dossier = state.dossiers.find((d) => d.id === dossierModal)

  // ------------------------------------------------------------ handlers
  const openDispatch = (inc) => {
    setDispatchFor(inc)
    setPicked(inc.targets.map((t, i) => (!t.orderId && isReachable(state, t.inst) ? i : -1)).filter((i) => i >= 0))
  }
  const confirmDispatch = (pin) => {
    if (!picked.length) return { ok: false, error: 'Select at least one institution target.' }
    const res = actions.dispatchFreeze(dispatchFor.id, picked, pin)
    if (res.ok) flash(res.warning ? `⚠ ${res.warning}` : `Secure API freeze dispatched for ${dispatchFor.id} to ${picked.length} institution(s). Bank priority queue updated.`)
    return res
  }
  const validate = (d) => {
    actions.validateDossier(d.id)
    flash(`⚡ SUCCESS: Victim report ${d.id} verified! Transferred to the dashboard freeze queue.`, 3500)
    setHighlightId(d.id)
    setTimeout(() => setHighlightId(null), 3000)
    setTimeout(() => setActiveTab('dashboard'), 1500)
  }
  const compareUpload = async (d, idx, file) => {
    if (!file) return
    setBusyHash(`${d.id}-${idx}`)
    const h = await computeFileHash(file)
    setBusyHash(null)
    if (h) actions.verifyFile(d.id, idx, h)
  }
  const exportCsv = () => {
    exportToCsv(`institutional_freeze_export_${Date.now()}.csv`, state.orders, [
      { label: 'OrderID', value: 'id' }, { label: 'CaseID', value: 'incidentId' }, { label: 'Institution', value: 'inst' }, { label: 'GatewayCode', value: 'gatewayCode' },
      { label: 'SuspectAccount', value: 'account' }, { label: 'Holder', value: 'holder' }, { label: 'AmountETB', value: 'amount' }, { label: 'Status', value: 'status' }, { label: 'GatewayRef', value: (o) => o.gatewayRef || '' },
    ])
    actions.audit('analyst', 'EXPORT_CSV', 'Exported institutional freeze orders to CSV')
    flash('Successfully exported institutional freeze orders to CSV.', 4000)
  }
  const exportPdf = () => {
    const lines = [
      { text: 'NDSIR - EXECUTIVE THREAT CONTAINMENT REPORT', bold: true, size: 14 }, `Generated: ${fmtDateTime(Date.now())}`, '',
      `Open incidents: ${activeQueue}   Freeze orders: ${state.orders.length}   Frozen: ${frozenCount}   ACK rate: ${ackRate}%`,
      `Average bank execution latency: ${fmtDuration(sla.avgMs)}   Within SLA: ${sla.withinPct}%`, '',
      { text: 'INCIDENTS', bold: true }, ...incidents.map((i) => `${i.id} | ${i.status} | ${i.risk} | ${i.vector} | ${i.targets.map((t) => `${t.inst}:${t.account}`).join(', ')}`), '',
      { text: 'FREEZE ORDERS', bold: true }, ...state.orders.map((o) => `${o.id} | ${o.inst} | ${o.account} | ${etb(o.amount)} | ${o.status} | ${o.gatewayRef || '-'}`),
    ]
    downloadBlob(`executive_containment_report_${Date.now()}.pdf`, buildPdf('NDSIR Executive Report', lines))
    actions.audit('analyst', 'EXPORT_PDF', 'Generated executive institutional threat containment PDF report')
    flash('Executive Institutional PDF Report generated and downloaded successfully.', 4000)
  }
  const submitIngest = async (e) => {
    e.preventDefault()
    setFormError(null)
    const f = form
    if (!f.victimName.trim() || !f.statement.trim() || !f.suspectAccount.trim()) return setFormError('Victim name, suspect account and statement are required.')
    if (!/^NID-ET-\d{4}-\d{4}$/.test(f.nationalId.trim())) return setFormError('National ID must match NID-ET-XXXX-XXXX.')
    const amount = Number(String(f.amount).replace(/,/g, ''))
    if (!amount || amount <= 0) return setFormError('Enter the stolen amount in ETB.')
    const files = [{ name: 'victim_statement.txt', size: `${Math.max(1, Math.round(f.statement.length / 1024))} KB`, kind: 'document', preview: f.statement, content: f.statement, sha256: sha256Hex(f.statement), verified: false }]
    for (const file of formFiles) {
      const h = await computeFileHash(file)
      const kind = file.type.startsWith('audio') ? 'audio' : file.type.startsWith('image') ? 'image' : file.type.includes('json') ? 'data' : 'document'
      files.push({ name: file.name, size: `${Math.max(1, Math.round(file.size / 1024))} KB`, kind, preview: 'Binary artifact captured at ingestion; SHA-256 sealed on receipt (file bytes are not retained by this demo store).', content: null, sha256: h, verified: true })
    }
    actions.ingestDossier({ channel: f.channel, victimName: f.victimName.trim(), nationalId: f.nationalId.trim(), phone: f.phone.trim(), inst: f.inst, amount, vector: f.vector.trim() || 'Unclassified', suspectAccount: f.suspectAccount.trim(), suspectHolder: f.suspectHolder.trim(), suspectPhone: f.suspectPhone.trim(), statement: f.statement.trim(), files })
    setIngestOpen(false); setForm(EMPTY_FORM); setFormFiles([])
    setActiveTab('evidence')
    flash(`New threat ingested via ${f.channel}. Verify its evidence artifacts to release it to the freeze queue.`)
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard & Motion Graph', icon: LayoutDashboard },
    { id: 'evidence', label: 'Victim Dossiers', icon: FolderOpen, count: state.dossiers.length },
    { id: 'audit', label: 'Audit Log', icon: History, count: analystLog.length },
  ]

  // donut geometry
  const C = 251.2
  let acc = 0
  const segs = shares.map((s, i) => { const len = (s.pct / 100) * C; const seg = { ...s, len, off: -acc, color: SEG_COLORS[i] }; acc += len; return seg })

  return (
    <PortalShell>
      <PortalHeader accent="cyan" icon={ShieldAlert} kicker="NATIONAL FRAUD RESPONSE & BANK GATEWAY DESK" title="Analyst Freeze & Institutional API Hub" tabs={tabs} active={activeTab} onTab={setActiveTab}
        right={
          <div className="flex items-center gap-2">
            <Btn accent="cyan" onClick={() => setIngestOpen(true)}><Plus className="h-3.5 w-3.5" /> Ingest Threat</Btn>
            <Btn variant="ghost" onClick={exportCsv}><Download className="h-3.5 w-3.5 text-cyan-400" /> CSV</Btn>
            <Btn onClick={exportPdf}><Download className="h-3.5 w-3.5" /> PDF Report</Btn>
          </div>
        } />
      <FlashBanner accent="cyan">{flashMsg}</FlashBanner>

      <main className="max-w-7xl mx-auto space-y-6">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <StatCard label="Total Intercept Volume" value={`${(45200 + state.dossiers.length).toLocaleString()}`} icon={Users} sub="Reports routed to banking gateways" />
              <StatCard label="Gateway ACK Rate" value={`${ackRate}%`} icon={TrendingUp} tone="text-emerald-400" sub="Orders acknowledged by bank switches" />
              <StatCard label="Active Freeze Queue" value={activeQueue} icon={Activity} sub="Incidents awaiting dispatch / bank ACK" />
              <StatCard label="Avg Bank Latency" value={fmtDuration(sla.avgMs)} icon={ShieldCheck} sub={`${sla.withinPct}% inside SLA`} />
            </div>

            <Panel className="bg-[#070d1d]/90">
              <PanelTitle icon={Radio} title="24-Hour Freeze Velocity & Institutional Attack Share" sub="Click an institution to focus its share of attack volume. Spikes (red) exceed 1.6× the hourly mean."
                right={
                  <div className="flex flex-wrap items-center gap-2">
                    {['all', ...INSTITUTIONS.map((i) => i.key)].map((k) => (
                      <button key={k} onClick={() => setInstFilter(k)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer uppercase ${instFilter === k ? 'bg-cyan-950 text-cyan-300 border border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'}`}>{k}</button>
                    ))}
                  </div>
                } />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                <div className="bg-black/60 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center shadow-inner">
                  <div className="relative w-48 h-48 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="#1e293b" strokeWidth="10" />
                      {segs.map((s) => (
                        <circle key={s.key} cx="50" cy="50" r="40" fill="transparent" stroke={s.color} strokeWidth={instFilter === s.key ? 14 : 10} strokeDasharray={`${s.len} ${C}`} strokeDashoffset={s.off} className="transition-all duration-700" opacity={instFilter === 'all' || instFilter === s.key ? 1 : 0.25} />
                      ))}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">{selShare ? selShare.short : 'Gateways'}</span>
                      <span className="text-2xl font-black text-cyan-300">{selShare ? `${selShare.pct}%` : `${state.nodes.filter((n) => n.inst && n.status !== 'ISOLATED').length}/${state.nodes.filter((n) => n.inst).length}`}</span>
                      <span className="text-[9px] text-emerald-400 font-bold">{selShare ? 'of attack volume' : 'API gateways online'}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-4 text-[11px] font-bold text-slate-300">
                    {segs.map((s) => <span key={s.key} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} /> {s.short} {s.pct}%</span>)}
                  </div>
                </div>
                <div className="lg:col-span-2 space-y-4">
                  <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Emergency Freeze Velocity · last 24 h</span>
                      <span className="text-[10px] text-slate-400">peak {Math.max(...velocity.map((v) => v.v))} / hr</span>
                    </div>
                    <BarSpark data={velocity} />
                    <div className="flex justify-between text-[9px] text-slate-500"><span>{String(velocity[0].hour).padStart(2, '0')}:00</span><span>now</span></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    {INSTITUTIONS.filter((i) => instFilter === 'all' || i.key === instFilter).map((i) => {
                      const nd = nodeFor(state, i.name)
                      return (
                        <div key={i.key} className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
                          <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">{i.short} gateway</span>
                          <p className="text-xl font-black text-white mt-1">{nd.status === 'ISOLATED' ? 'ISOLATED' : `${nd.latency} ms`}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{nd.status === 'ISOLATED' ? 'Severed by Administrator' : `${nd.status} · ${nd.acks} ACKs`}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </Panel>

            <Panel className="bg-[#070d1d]/80">
              <PanelTitle title="Active Incident Freeze Control Queue" sub="Authorize emergency freezes — one incident can fan out to several institutions at once"
                right={<div className="text-xs text-cyan-400 font-bold bg-cyan-950/60 border border-cyan-500/30 px-3 py-1 rounded-xl">Showing {shown.length} Incident Routes</div>} />
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Case ID</th><th className="py-3 px-4">Target Institution & Gateway</th><th className="py-3 px-4">Suspect Account · Holder</th><th className="py-3 px-4">Amount</th><th className="py-3 px-4">Attack Vector</th><th className="py-3 px-4">Freeze Status</th><th className="py-3 px-4 text-right">Gateway Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {shown.length === 0 && <tr><td colSpan={7}><Empty>No incidents match this institution filter.</Empty></td></tr>}
                    {shown.map((inc) => {
                      const canDispatch = ['PENDING_FREEZE', 'PARTIALLY_DISPATCHED'].includes(inc.status)
                      return (
                        <tr key={inc.id} className="hover:bg-slate-900/60 transition-colors align-top">
                          <td className="py-4 px-4 font-bold text-cyan-400">{inc.id}<div className="mt-1"><Pill status={inc.risk} /></div></td>
                          <td className="py-4 px-4 space-y-1.5">{inc.targets.map((t, i) => <div key={i}><p className="text-white font-semibold">{t.inst}</p><p className="text-[10px] font-mono text-cyan-400/80">{t.gatewayCode}</p></div>)}</td>
                          <td className="py-4 px-4 text-slate-300 font-mono space-y-1.5">{inc.targets.map((t, i) => <div key={i}>{t.account}<p className="text-[10px] text-slate-500 font-sans">{t.holder}</p></div>)}</td>
                          <td className="py-4 px-4 text-cyan-300 font-bold">{etb(inc.targets.reduce((a, t) => a + t.amount, 0))}</td>
                          <td className="py-4 px-4 text-slate-400">{inc.vector}</td>
                          <td className="py-4 px-4"><Pill status={inc.status} pulse /></td>
                          <td className="py-4 px-4 text-right">
                            {canDispatch ? (
                              <button onClick={() => openDispatch(inc)} className="px-3.5 py-1.5 bg-rose-950 border border-rose-500/50 hover:bg-rose-900 text-rose-300 font-bold rounded-lg transition-all cursor-pointer text-xs shadow-md flex items-center gap-1.5 ml-auto"><Send className="h-3.5 w-3.5" /> {inc.status === 'PARTIALLY_DISPATCHED' ? 'Dispatch Remaining' : 'Send Freeze to Bank'}</button>
                            ) : inc.status === 'DISPATCHED' ? (
                              <span className="text-amber-400 font-bold text-[11px] animate-pulse">Awaiting bank ACK…</span>
                            ) : inc.status === 'RESTORED' ? (
                              <span className="text-slate-400 font-bold text-[11px]">Restored (false positive)</span>
                            ) : (
                              <span className="text-emerald-400 font-bold text-[11px] flex items-center justify-end gap-1"><CheckCircle className="h-3.5 w-3.5" /> ACK Received</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        )}

        {activeTab === 'evidence' && (
          <Panel>
            <PanelTitle icon={UserCheck} title="Victim Dossiers & Evidence Investigation Center" sub="Verify every artifact's SHA-256 — fully verified dossiers sync to the Police Evidence Locker and can be escalated to the freeze queue"
              right={<span className="text-xs bg-cyan-950 border border-cyan-500/40 px-3 py-1 rounded-xl text-cyan-300 font-bold">{state.dossiers.filter((d) => d.status !== 'PENDING_ANALYST_REVIEW').length} / {state.dossiers.length} Verified</span>} />
            <div className="space-y-4 pt-2">
              {state.dossiers.length === 0 && <Empty>No dossiers ingested yet.</Empty>}
              {state.dossiers.map((d) => {
                const queued = d.status === 'QUEUED_FOR_FREEZE'
                const verified = d.status === 'DOSSIER_VERIFIED'
                return (
                  <div key={d.id} className={`bg-slate-900/80 border rounded-2xl p-5 space-y-4 transition-all duration-500 ${highlightId === d.id ? 'border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.6)]' : 'border-slate-800 hover:border-cyan-500/40'}`}>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-800/80 pb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold bg-cyan-950 border border-cyan-500/40 text-cyan-300 px-3 py-1 rounded-xl">{d.id}</span>
                        <div>
                          <h3 className="text-sm font-bold text-white">{d.victimName} <span className="text-xs text-slate-500 font-normal">({d.phone})</span></h3>
                          <p className="text-[11px] text-slate-400">National ID: <span className="text-slate-300 font-mono">{d.nationalId}</span> · via {d.channel} · {fmtDateTime(d.date)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs bg-slate-800 text-cyan-300 px-3 py-1 rounded-xl font-bold border border-slate-700">{d.inst} — {etb(d.amount)}</span>
                        <Pill status={d.status} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="bg-black/40 border border-slate-800/80 p-3.5 rounded-xl space-y-1.5">
                        <p className="text-[11px] uppercase font-bold text-cyan-400">Victim Incident Statement</p>
                        <p className="text-slate-200 leading-relaxed italic">"{d.statement}"</p>
                        <p className="text-[11px] text-slate-500 pt-1">Attack Vector: <span className="text-amber-400 font-semibold">{d.vector}</span></p>
                        <p className="text-[11px] text-slate-500">Suspect: <span className="text-rose-400 font-mono">{d.suspectAccount}</span> {d.suspectPhone && <span className="text-slate-300">· {d.suspectPhone}</span>}</p>
                      </div>
                      <div className="bg-black/40 border border-slate-800/80 p-3.5 rounded-xl space-y-2">
                        <p className="text-[11px] uppercase font-bold text-cyan-400">Cryptographic Evidence Inspector ({d.files.length})</p>
                        <div className="space-y-1.5">
                          {d.files.map((file, idx) => (
                            <div key={idx} className="bg-slate-900 p-2 rounded-lg border border-slate-800 space-y-1">
                              <div className="flex justify-between items-center gap-2">
                                <span className="text-cyan-300 flex items-center gap-1.5 truncate"><FileText className="h-3.5 w-3.5 shrink-0" /> {file.name} <span className="text-[10px] text-slate-500">({file.size})</span></span>
                                {file.verified ? <span className="text-[10px] text-emerald-400 flex items-center gap-1 shrink-0"><ShieldCheck className="h-3 w-3" /> SHA-256 OK</span>
                                  : file.integrityFailed ? <span className="text-[10px] text-rose-400 flex items-center gap-1 shrink-0"><AlertTriangle className="h-3 w-3" /> MISMATCH</span>
                                  : <span className="text-[10px] text-amber-400 shrink-0">UNVERIFIED</span>}
                              </div>
                              <Mono>{file.sha256}</Mono>
                              {!file.verified && (
                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                  <button onClick={() => actions.verifyFile(d.id, idx)} className="px-2.5 py-1 bg-cyan-950 border border-cyan-500/40 text-cyan-300 rounded-lg text-[10px] font-bold cursor-pointer flex items-center gap-1"><Fingerprint className="h-3 w-3" /> Re-hash artifact</button>
                                  <label className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg text-[10px] font-bold cursor-pointer">{busyHash === `${d.id}-${idx}` ? 'Hashing…' : 'Compare uploaded file…'}<input type="file" className="hidden" onChange={(e) => compareUpload(d, idx, e.target.files[0])} /></label>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-end gap-3 pt-2 border-t border-slate-800/60">
                      <Btn variant="ghost" onClick={() => { actions.audit('analyst', 'INSPECT_DOSSIER', `Opened intelligence dossier for victim ${d.victimName} (${d.id})`); setDossierModal(d.id) }}><Eye className="h-3.5 w-3.5 text-cyan-400" /> View Full Case Dossier</Btn>
                      <Btn disabled={!verified} onClick={() => validate(d)}><CheckCircle className="h-3.5 w-3.5" /> {queued ? `Queued as ${d.incidentId}` : verified ? 'Validate & Authorize Freeze' : 'Verify all artifacts first'}</Btn>
                    </div>
                  </div>
                )
              })}
            </div>
          </Panel>
        )}

        {activeTab === 'audit' && (
          <Panel>
            <PanelTitle icon={History} title="Immutable Analyst Action Audit Trail" sub="Chronological record of ingestions, evidence verifications, dispatches and bank acknowledgments — each entry is SHA-256 chained and signed"
              right={<span className={`text-xs px-3 py-1 rounded-xl font-bold border ${chain.ok ? 'bg-emerald-950 border-emerald-500/40 text-emerald-400' : 'bg-rose-950 border-rose-500/40 text-rose-400'}`}>{chain.ok ? 'CHAIN INTEGRITY VERIFIED' : `CHAIN BROKEN @ #${chain.firstBad}`}</span>} />
            <div className="space-y-2.5">
              {analystLog.map((log) => (
                <div key={log.seq} className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold bg-cyan-950 border border-cyan-500/30 text-cyan-300 px-2.5 py-1 rounded-lg">{log.id}</span>
                    <div>
                      <div className="flex items-center gap-2"><span className="font-bold text-white">{log.action}</span><span className="text-[10px] text-slate-500">by {log.actor}</span></div>
                      <p className="text-slate-400 text-[11px]">{log.details}</p>
                      <Mono>sha256 {shortHash(log.hash, 16, 8)} · sig {shortHash(log.sig, 10, 6)}</Mono>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500"><CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> {fmtDateTime(log.ts)}</div>
                </div>
              ))}
            </div>
          </Panel>
        )}
      </main>

      {/* multilateral dispatch with analyst PIN */}
      <PinModal open={!!dispatchFor} onClose={() => setDispatchFor(null)} accent="cyan" title="Bank Gateway PIN Verification" demoPin={PINS.analyst} confirmLabel="Confirm PIN & Send to Bank Gateways" onConfirm={confirmDispatch}
        description={<>Dispatching an emergency asset freeze for <span className="text-white font-bold">{dispatchFor?.id}</span> requires your 4-digit analyst PIN. Choose the institutions to notify:</>}>
        <div className="space-y-1.5">
          {dispatchFor?.targets.map((t, i) => {
            const reachable = isReachable(state, t.inst)
            const disabled = !!t.orderId || !reachable
            return (
              <label key={i} className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border text-[11px] ${disabled ? 'border-slate-800 text-slate-600' : 'border-slate-700 text-slate-200 cursor-pointer'}`}>
                <span className="flex items-center gap-2">
                  <input type="checkbox" disabled={disabled} checked={picked.includes(i)} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, i] : p.filter((x) => x !== i)))} />
                  <span><b>{t.inst}</b> · <span className="font-mono">{t.account}</span> · {t.holder}</span>
                </span>
                <span className="font-bold">{t.orderId ? `sent (${t.orderId})` : !reachable ? 'GATEWAY ISOLATED' : etb(t.amount)}</span>
              </label>
            )
          })}
        </div>
      </PinModal>

      {/* ingest threat */}
      <Modal open={ingestOpen} onClose={() => setIngestOpen(false)} title="Omnichannel Threat Ingestion" icon={Plus} wide>
        <form onSubmit={submitIngest} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ingestion channel"><select className={inputCls()} value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>{CHANNELS.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Victim's institution"><select className={inputCls()} value={form.inst} onChange={(e) => setForm({ ...form, inst: e.target.value })}>{INSTITUTIONS.map((i) => <option key={i.key}>{i.name}</option>)}</select></Field>
            <Field label="Victim full name"><input className={inputCls()} value={form.victimName} onChange={(e) => setForm({ ...form, victimName: e.target.value })} /></Field>
            <Field label="National ID (NID-ET-XXXX-XXXX)"><input className={inputCls()} placeholder="NID-ET-1234-5678" value={form.nationalId} onChange={(e) => setForm({ ...form, nationalId: e.target.value })} /></Field>
            <Field label="Victim phone"><input className={inputCls()} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Amount stolen (ETB)"><input className={inputCls()} inputMode="numeric" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
            <Field label="Suspect / mule account"><input className={inputCls()} placeholder="ACC-0000-****-0000" value={form.suspectAccount} onChange={(e) => setForm({ ...form, suspectAccount: e.target.value })} /></Field>
            <Field label="Account holder (if known)"><input className={inputCls()} value={form.suspectHolder} onChange={(e) => setForm({ ...form, suspectHolder: e.target.value })} /></Field>
            <Field label="Suspect phone number"><input className={inputCls()} placeholder="+251 9x xxx xxxx" value={form.suspectPhone} onChange={(e) => setForm({ ...form, suspectPhone: e.target.value })} /></Field>
            <Field label="Attack vector"><input className={inputCls()} placeholder="e.g. SIM swap, phishing" value={form.vector} onChange={(e) => setForm({ ...form, vector: e.target.value })} /></Field>
          </div>
          <Field label="Citizen statement"><textarea rows={3} className={inputCls()} value={form.statement} onChange={(e) => setForm({ ...form, statement: e.target.value })} /></Field>
          <Field label="Evidence files (hashed with SHA-256 on receipt)"><input type="file" multiple onChange={(e) => setFormFiles(Array.from(e.target.files))} className="text-[11px] text-slate-400" /></Field>
          {formError && <p className="text-rose-400 text-[11px]">{formError}</p>}
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
            <Btn variant="ghost" onClick={() => setIngestOpen(false)}>Cancel</Btn>
            <button type="submit" className="px-4 py-2 rounded-xl text-xs bg-cyan-950 border border-cyan-500/50 hover:bg-cyan-900 text-cyan-300 font-bold cursor-pointer">Ingest & Queue for Verification</button>
          </div>
        </form>
      </Modal>

      {/* dossier modal */}
      <Modal open={!!dossier} onClose={() => setDossierModal(null)} title={`Comprehensive Victim Case Dossier — ${dossier?.id}`} icon={FileText} wide>
        {dossier && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
              <p><span className="text-slate-500">Victim:</span> <strong className="text-white">{dossier.victimName}</strong></p>
              <p><span className="text-slate-500">National ID:</span> <strong className="text-white">{dossier.nationalId}</strong></p>
              <p><span className="text-slate-500">Phone:</span> <strong className="text-cyan-300">{dossier.phone}</strong></p>
              <p><span className="text-slate-500">Institution:</span> <strong className="text-white">{dossier.inst}</strong></p>
              <p><span className="text-slate-500">Loss:</span> <strong className="text-cyan-400">{etb(dossier.amount)}</strong></p>
              <p><span className="text-slate-500">Suspect destination:</span> <strong className="text-rose-400">{dossier.suspectAccount}</strong></p>
              <p><span className="text-slate-500">Suspect phone:</span> <strong className="text-rose-300">{dossier.suspectPhone || '—'}</strong></p>
              <p><span className="text-slate-500">Channel:</span> <strong className="text-white">{dossier.channel}</strong></p>
            </div>
            <div className="bg-black/50 p-3 rounded-xl border border-slate-800 text-slate-300 italic">"{dossier.statement}"</div>
            <div className="space-y-2">
              {dossier.files.map((f, i) => (
                <div key={i} className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl flex justify-between items-center gap-2">
                  <div className="min-w-0"><p className="text-cyan-300 font-semibold">{f.name}</p><Mono>SHA-256: {f.sha256}</Mono></div>
                  <Pill status={f.verified ? 'VERIFIED' : f.integrityFailed ? 'FAILED' : 'PENDING'} label={f.verified ? 'Verified' : f.integrityFailed ? 'Mismatch' : 'Unverified'} />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <Btn variant="ghost" onClick={() => setDossierModal(null)}>Close Dossier</Btn>
              <Btn disabled={dossier.status !== 'DOSSIER_VERIFIED'} onClick={() => { const d = dossier; setDossierModal(null); validate(d) }}><Send className="h-3.5 w-3.5" /> Authorize & Queue for Freeze</Btn>
            </div>
          </div>
        )}
      </Modal>
    </PortalShell>
  )
}
