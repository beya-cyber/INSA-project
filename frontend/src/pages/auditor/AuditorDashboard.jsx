// src/pages/auditor/AuditorDashboard.jsx
// Compliance Auditor portal — oversight & governance vault.
// Reads the same SHA-256-chained, HMAC-signed trail that Analyst / Bank / Police / Admin write to.
import React, { useMemo, useState } from 'react'
import { FileCheck, ShieldCheck, Search, Download, FileText, Fingerprint, ScrollText, Gauge, CheckCircle2, AlertTriangle, Eye } from 'lucide-react'
import { useNdsir, useNow } from '../../context/NdsirContext'
import { INSTITUTIONS, SLA_TARGET_MS, computeSla, pinStats, verifyChain, validateWarrantSignature } from '../../store/ndsirStore'
import { etb, fmtDateTime, fmtDuration, shortHash, downloadBlob } from '../../lib/format'
import { sha256Hex } from '../../lib/sha256'
import { computeFileHash } from '../../lib/hashUtils'
import { exportToCsv } from '../../lib/csvExport'
import { buildPdf } from '../../lib/pdfLite'
import { PortalShell, PortalHeader, FlashBanner, useFlash, Panel, PanelTitle, StatCard, Pill, Btn, Mono, Empty, Field, inputCls } from '../../components/portal/ui'

const ROLE_FILTERS = ['ALL', 'analyst', 'bank', 'police', 'admin', 'auditor', 'system']

export default function AuditorDashboard() {
  const { state, actions } = useNdsir()
  const now = useNow(5000)
  const [flashMsg, flash] = useFlash()
  const [tab, setTab] = useState('trail')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [expanded, setExpanded] = useState(null)
  const [simTamper, setSimTamper] = useState(false)
  const [text, setText] = useState('')
  const [expected, setExpected] = useState('')
  const [fileHash, setFileHash] = useState(null)
  const [fileName, setFileName] = useState('')
  const [verdict, setVerdict] = useState(null)
  const [wId, setWId] = useState('')
  const [wSig, setWSig] = useState('')
  const [wRes, setWRes] = useState(null)

  const sla = computeSla(state.orders, now)
  const pins = pinStats(state.audit)
  // The verifier can run against a deliberately tampered copy to demonstrate detection; the real trail is never mutated.
  const working = useMemo(() => (simTamper && state.audit.length > 4 ? state.audit.map((e, i) => (i === 3 ? { ...e, details: `${e.details} [EDITED]` } : e)) : state.audit), [state.audit, simTamper])
  const chain = useMemo(() => verifyChain(working), [working])
  const entries = useMemo(() => working.slice().reverse().filter((e) => (roleFilter === 'ALL' || e.role === roleFilter) && `${e.id} ${e.actor} ${e.action} ${e.details}`.toLowerCase().includes(search.toLowerCase())), [working, roleFilter, search])
  const regs = [
    { id: 'NBE-FXD-85', rule: 'NBE Directive FXD/85/2024 — freeze execution within SLA', pct: sla.withinPct, detail: `${sla.executed} executed · avg ${fmtDuration(sla.avgMs)} · target ≤ ${SLA_TARGET_MS / 1000}s` },
    { id: 'DUAL-CTRL', rule: 'Dual-control PIN authorisation success', pct: pins.pct, detail: `${pins.ok} successful · ${pins.bad} failed attempts` },
    { id: 'LEDGER', rule: 'Audit-trail cryptographic integrity', pct: Math.round((chain.validCount / Math.max(working.length, 1)) * 1000) / 10, detail: `${chain.validCount}/${working.length} entries verify` },
    { id: 'WARRANT', rule: 'Warrant signature validity (Proclamation 1185/2020)', pct: (() => { const sg = state.warrants.filter((w) => w.signature); return sg.length ? Math.round((sg.filter((w) => validateWarrantSignature(w, w.signature)).length / sg.length) * 1000) / 10 : 100 })(), detail: `${state.warrants.filter((w) => w.signature).length} signed warrants checked` },
  ]
  const overall = Math.round((regs.reduce((a, r) => a + r.pct, 0) / regs.length) * 10) / 10

  const verifyData = (computed, label, against) => {
    const match = against.trim().toLowerCase() === computed
    const known = state.evidence.flatMap((e) => e.files.map((f) => ({ ...f, ev: e.id }))).find((f) => f.sha256 === computed)
    setVerdict({ computed, label, match: against.trim() ? match : null, known })
    actions.audit('auditor', 'FORENSIC_HASH_VERIFIED', `${label}: sha256 ${computed.slice(0, 16)}… ${against.trim() ? (match ? 'MATCHES expected hash' : 'DOES NOT MATCH expected hash') : 'computed (no expected value supplied)'}${known ? ` · registered artifact ${known.name} (${known.ev})` : ''}`)
  }
  const onFile = async (f) => { if (!f) return; setFileName(f.name); const h = await computeFileHash(f); setFileHash(h); verifyData(h, `File ${f.name}`, expected) }

  const stamp = new Date().toISOString().slice(0, 10)
  const exportCsv = () => {
    exportToCsv(`ndsir_audit_trail_${stamp}.csv`, working, [
      { label: 'Seq', value: 'seq' }, { label: 'ID', value: 'id' }, { label: 'Timestamp', value: (e) => new Date(e.ts).toISOString() }, { label: 'Role', value: 'role' }, { label: 'Actor', value: 'actor' },
      { label: 'Action', value: 'action' }, { label: 'Details', value: 'details' }, { label: 'PrevHash', value: 'prevHash' }, { label: 'Hash', value: 'hash' }, { label: 'Signature', value: 'sig' },
    ])
    actions.audit('auditor', 'EXPORT_CSV', `Exported ${working.length} audit entries to CSV`)
    flash('Audit trail exported to CSV.', 4000)
  }
  const exportPdf = () => {
    const head = working[working.length - 1]
    const lines = [
      { text: 'NDSIR - CERTIFIED COMPLIANCE REPORT', bold: true, size: 14 }, 'For parliamentary oversight and judicial proceedings', `Generated: ${fmtDateTime(Date.now())} by ${actionsActor()}`, '',
      { text: 'CERTIFICATION', bold: true }, `Audit entries: ${working.length}   Chain integrity: ${chain.ok ? 'VERIFIED' : `BROKEN at #${chain.firstBad}`}`, `Chain head hash: ${head ? head.hash : '-'}`, `Overall regulatory adherence: ${overall}%`, '',
      { text: 'REGULATORY SCORECARD', bold: true }, ...regs.map((r) => `${r.id} | ${r.pct}% | ${r.rule} | ${r.detail}`), '',
      { text: 'SLA BY INSTITUTION', bold: true }, ...sla.perInst.map((p) => `${p.short}: executed ${p.executed}, avg ${fmtDuration(p.avgMs)}, within SLA ${p.withinPct ?? '-'}%, pending ${p.pending}`), '',
      { text: 'FREEZE ORDERS', bold: true }, ...state.orders.map((o) => `${o.id} | ${o.inst} | ${etb(o.amount)} | ${o.status} | ${o.gatewayRef || '-'}`), '',
      { text: 'AUDIT TRAIL (most recent 120)', bold: true }, ...working.slice(-120).reverse().map((e) => `#${e.seq} ${new Date(e.ts).toISOString()} ${e.role}/${e.actor} ${e.action} :: ${e.details} [${e.hash.slice(0, 16)}]`),
    ]
    downloadBlob(`ndsir_certified_compliance_report_${stamp}.pdf`, buildPdf('NDSIR Certified Compliance Report', lines))
    actions.audit('auditor', 'EXPORT_PDF', `Certified compliance report issued (chain ${chain.ok ? 'verified' : 'BROKEN'}, head ${head ? head.hash.slice(0, 16) : '-'}…)`)
    flash('Certified PDF compliance report generated.', 4000)
  }

  const tabs = [
    { id: 'trail', label: 'Immutable Audit Trail', icon: ScrollText, count: state.audit.length },
    { id: 'score', label: 'Regulatory Adherence Scorecards', icon: Gauge },
    { id: 'verify', label: 'Forensic Integrity Verifier', icon: Fingerprint },
  ]

  return (
    <PortalShell>
      <PortalHeader accent="amber" icon={FileCheck} kicker="INDEPENDENT REGULATORY OVERSIGHT" title="Oversight & Governance Vault" tabs={tabs} active={tab} onTab={setTab}
        right={<div className="flex gap-2"><Btn variant="ghost" onClick={exportCsv}><Download className="h-3.5 w-3.5 text-amber-400" /> CSV</Btn><Btn accent="amber" onClick={exportPdf}><Download className="h-3.5 w-3.5" /> Certified PDF</Btn></div>} />
      <FlashBanner accent="amber">{flashMsg}</FlashBanner>

      <main className="max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="Audit Entries" value={state.audit.length} icon={ScrollText} sub="Append-only, hash-chained" />
          <StatCard label="Chain Integrity" value={chain.ok ? 'VERIFIED' : 'BROKEN'} tone={chain.ok ? 'text-emerald-400' : 'text-rose-400'} icon={ShieldCheck} sub={chain.ok ? 'Every link and signature checks out' : `First failure at entry #${chain.firstBad}`} />
          <StatCard label="Regulatory Score" value={`${overall}%`} tone="text-emerald-400" icon={Gauge} sub="Mean of four statutory controls" />
          <StatCard label="SLA Compliance" value={`${sla.withinPct}%`} tone={sla.breachedPending ? 'text-rose-400' : 'text-white'} icon={CheckCircle2} sub={sla.breachedPending ? `${sla.breachedPending} pending order(s) past SLA` : `${sla.pending} pending in window`} />
        </div>

        {tab === 'trail' && (
          <Panel>
            <PanelTitle accent="amber" icon={ScrollText} title="Immutable Audit Trail" sub="Every freeze command, PIN verification, override, warrant and admin action across all portals — SHA-256 chained and HMAC-signed"
              right={<div className="flex flex-col md:flex-row gap-2">
                <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search actor, action, ID…" className={`${inputCls('amber')} pl-9 md:w-60`} /></div>
                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={inputCls('amber')}>{ROLE_FILTERS.map((r) => <option key={r} value={r}>{r === 'ALL' ? 'All portals' : r}</option>)}</select>
              </div>} />
            {!chain.ok && <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Tampering detected: hash chain breaks at entry #{chain.firstBad}.</div>}
            <div className="space-y-2">
              {entries.length === 0 && <Empty>No entries match.</Empty>}
              {entries.slice(0, 150).map((e) => {
                const r = chain.results[e.seq - 1]
                return (
                  <div key={e.seq} className={`rounded-xl border p-3.5 text-xs ${r && !r.ok ? 'border-rose-500/50 bg-rose-950/20' : 'bg-slate-900/60 border-slate-800/80'}`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold bg-amber-950 border border-amber-500/30 text-amber-300 px-2.5 py-1 rounded-lg">{e.id}</span>
                        <div><div className="flex items-center gap-2 flex-wrap"><span className="font-bold text-white">{e.action}</span><span className="text-[10px] text-slate-500">by {e.actor} · {e.role}</span></div><p className="text-slate-400 text-[11px]">{e.details}</p></div>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 shrink-0">
                        {r && (r.ok ? <span className="text-emerald-400 flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> signed</span> : <span className="text-rose-400 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> INVALID</span>)}
                        {fmtDateTime(e.ts)}
                        <button onClick={() => setExpanded(expanded === e.seq ? null : e.seq)} className="text-amber-400 cursor-pointer" aria-label="Toggle hashes"><Eye className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                    {expanded === e.seq && <div className="mt-2 pt-2 border-t border-slate-800 space-y-0.5"><Mono>prev {e.prevHash}</Mono><br /><Mono>hash {e.hash}</Mono><br /><Mono>sig&nbsp; {e.sig}</Mono></div>}
                  </div>
                )
              })}
            </div>
          </Panel>
        )}

        {tab === 'score' && (
          <>
            <Panel>
              <PanelTitle accent="amber" icon={Gauge} title="Regulatory Adherence Scorecards" sub="Live statutory controls computed from the shared audit trail and freeze orders" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {regs.map((r) => (
                  <div key={r.id} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-2">
                    <div className="flex justify-between items-start gap-2"><div><p className="text-[11px] font-mono text-amber-400">{r.id}</p><p className="text-xs text-slate-300">{r.rule}</p></div><p className={`text-2xl font-black ${r.pct >= 95 ? 'text-emerald-400' : r.pct >= 80 ? 'text-amber-400' : 'text-rose-400'}`}>{r.pct}%</p></div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden"><div className={`h-full rounded-full ${r.pct >= 95 ? 'bg-emerald-400' : r.pct >= 80 ? 'bg-amber-400' : 'bg-rose-500'}`} style={{ width: `${Math.min(r.pct, 100)}%` }} /></div>
                    <p className="text-[10px] text-slate-500">{r.detail}</p>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel>
              <PanelTitle accent="amber" icon={CheckCircle2} title="SLA Response Time by Institution" sub={`Bank execution time measured from analyst/police dispatch; target ≤ ${SLA_TARGET_MS / 1000} seconds`} />
              <div className="overflow-x-auto"><table className="w-full text-left border-collapse text-xs">
                <thead><tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider"><th className="py-3 px-4">Institution</th><th className="py-3 px-4">Executed</th><th className="py-3 px-4">Avg response</th><th className="py-3 px-4">Within SLA</th><th className="py-3 px-4">Pending</th></tr></thead>
                <tbody className="divide-y divide-slate-800/60">{sla.perInst.map((p) => <tr key={p.inst}><td className="py-3 px-4 text-white font-semibold">{p.inst}</td><td className="py-3 px-4">{p.executed}</td><td className="py-3 px-4 font-mono">{fmtDuration(p.avgMs)}</td><td className={`py-3 px-4 font-bold ${p.withinPct == null ? 'text-slate-500' : p.withinPct >= 90 ? 'text-emerald-400' : p.withinPct >= 70 ? 'text-amber-400' : 'text-rose-400'}`}>{p.withinPct == null ? '—' : `${p.withinPct}%`}</td><td className="py-3 px-4">{p.pending}</td></tr>)}</tbody>
              </table></div>
            </Panel>
          </>
        )}

        {tab === 'verify' && (
          <>
            <Panel>
              <PanelTitle accent="amber" icon={ShieldCheck} title="Audit-Chain Verifier" sub="Recomputes every SHA-256 link and HMAC signature in the trail"
                right={<label className="flex items-center gap-2 text-[11px] text-slate-400 cursor-pointer"><input type="checkbox" checked={simTamper} onChange={(e) => setSimTamper(e.target.checked)} /> Demonstrate tamper detection (edits a <b>copy</b> of entry #4)</label>} />
              <div className={`p-4 rounded-xl border text-xs font-bold ${chain.ok ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-400' : 'bg-rose-950/50 border-rose-500/40 text-rose-300'}`}>
                {chain.ok ? `✔ All ${working.length} entries verified. Head: ${shortHash(working[working.length - 1]?.hash, 20, 8)}` : `✘ Integrity failure at entry #${chain.firstBad}: its recorded hash no longer matches its contents, so everything after it is untrustworthy.`}
              </div>
            </Panel>
            <Panel>
              <PanelTitle accent="amber" icon={Fingerprint} title="Evidence & Document Hash Verifier" sub="Compute SHA-256 of pasted text or an uploaded file and compare against the hash on record" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-xs">
                <div className="space-y-3">
                  <Field label="Expected SHA-256 (optional)"><input className={`${inputCls('amber')} font-mono`} value={expected} onChange={(e) => setExpected(e.target.value)} placeholder="64-char hex" /></Field>
                  <Field label="Option A — paste content"><textarea rows={4} className={`${inputCls('amber')} font-mono`} value={text} onChange={(e) => setText(e.target.value)} /></Field>
                  <Btn accent="amber" disabled={!text} onClick={() => verifyData(sha256Hex(text), 'Pasted text', expected)}><Fingerprint className="h-3.5 w-3.5" /> Hash text</Btn>
                  <Field label="Option B — upload a file"><input type="file" onChange={(e) => onFile(e.target.files[0])} className="text-[11px] text-slate-400" /></Field>
                  {fileName && <p className="text-[10px] text-slate-500">{fileName} → <span className="font-mono">{shortHash(fileHash, 16, 8)}</span></p>}
                  <div className="border-t border-slate-800 pt-3 space-y-2"><p className="text-[11px] text-slate-400 font-bold uppercase">Registered evidence artifacts</p>
                    {state.evidence.flatMap((e) => e.files.map((f, i) => <button key={`${e.id}-${i}`} onClick={() => { setExpected(f.sha256); actions.accessEvidence(e.id, f.name); if (f.content != null) verifyData(sha256Hex(f.content), `Artifact ${f.name} (${e.id})`, f.sha256) }} className="w-full text-left bg-slate-900/60 border border-slate-800 hover:border-amber-500/40 rounded-lg px-3 py-1.5 cursor-pointer"><span className="text-amber-300">{f.name}</span> <Mono>{e.id} · {shortHash(f.sha256, 12, 6)}</Mono></button>))}</div>
                </div>
                <div className="space-y-4">
                  <div className="bg-black/40 border border-slate-800 rounded-xl p-4 min-h-[8rem]">
                    {!verdict ? <p className="text-slate-500 italic">No verification run yet.</p> : (
                      <div className="space-y-2"><p className="text-white font-bold">{verdict.label}</p><Mono>sha256 {verdict.computed}</Mono>
                        {verdict.match === true && <p className="text-emerald-400 font-bold">✔ MATCH — identical to the expected hash. Untampered.</p>}
                        {verdict.match === false && <p className="text-rose-400 font-bold">✘ MISMATCH — content differs from the expected hash.</p>}
                        {verdict.match === null && <p className="text-slate-400">No expected hash supplied.</p>}
                        {verdict.known && <p className="text-amber-300">Matches registered artifact {verdict.known.name} in locker {verdict.known.ev}.</p>}
                      </div>)}
                  </div>
                  <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-2">
                    <p className="text-[11px] text-slate-400 font-bold uppercase">Warrant signature check</p>
                    <div className="grid grid-cols-2 gap-2"><input className={inputCls('amber')} placeholder="WAR-2026-449" value={wId} onChange={(e) => setWId(e.target.value)} /><input className={`${inputCls('amber')} font-mono`} placeholder="signature" value={wSig} onChange={(e) => setWSig(e.target.value)} /></div>
                    <Btn accent="amber" onClick={() => setWRes({ id: wId.trim(), ok: actions.validateWarrant(wId.trim(), wSig) })}>Validate</Btn>
                    {wRes && <p className={`font-bold ${wRes.ok ? 'text-emerald-400' : 'text-rose-400'}`}>{wRes.ok ? `✔ ${wRes.id}: signature valid` : `✘ ${wRes.id}: invalid or unknown`}</p>}
                    <div className="flex flex-wrap gap-1.5">{state.warrants.filter((w) => w.signature).map((w) => <button key={w.id} onClick={() => { setWId(w.id); setWSig(w.signature) }} className="text-[10px] px-2 py-1 rounded-lg bg-slate-800 text-amber-300 cursor-pointer">{w.id}</button>)}</div>
                  </div>
                </div>
              </div>
            </Panel>
          </>
        )}
      </main>
    </PortalShell>
  )
}

function actionsActor() { return sessionStorage.getItem('ndsir_user') || 'Auditor_Mulugeta_T' }
