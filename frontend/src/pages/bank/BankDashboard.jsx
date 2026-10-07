// src/pages/bank/BankDashboard.jsx
// Commercial Bank Portal — the asset sequestration switch.
// Freeze orders arrive live from the Analyst Hub (and Police warrants). Executing one needs a
// dual-control 4-digit PIN, mints a CBE-SEC-style gateway reference, ACKs the command network and
// appends a signed entry to the Compliance Auditor's immutable trail.
import React, { useState } from 'react'
import { Building, Lock, Activity, Wifi, WifiOff, ShieldCheck, Landmark, FileText, Download, RotateCcw, AlertTriangle, CheckCircle } from 'lucide-react'
import { useNdsir, useNow } from '../../context/NdsirContext'
import { INSTITUTIONS, PINS, SLA_TARGET_MS, computeSla } from '../../store/ndsirStore'
import { etb, fmtDateTime, fmtDuration, fmtTime, downloadBlob } from '../../lib/format'
import { buildPdf } from '../../lib/pdfLite'
import { PortalShell, PortalHeader, FlashBanner, useFlash, Panel, PanelTitle, StatCard, Pill, Btn, Mono, Empty, PinModal, Field, inputCls, Sparkline } from '../../components/portal/ui'

export default function BankDashboard() {
  const { state, actions } = useNdsir()
  const now = useNow(1000)
  const [flashMsg, flash] = useFlash()
  const [tab, setTab] = useState('queue')
  const [filter, setFilter] = useState('all')
  const [exec, setExec] = useState(null)       // order being executed
  const [restore, setRestore] = useState(null) // order being cleared/restored
  const [reason, setReason] = useState('')

  const sla = computeSla(state.orders, now)
  const orders = state.orders.filter((o) => filter === 'all' || o.inst.toLowerCase().includes(filter))
  const pending = state.orders.filter((o) => o.status === 'PENDING_EXECUTION')
  const frozenTotal = state.orders.filter((o) => o.status === 'FROZEN_SECURED').reduce((a, o) => a + o.amount, 0)
  const gatewayNodes = state.nodes.filter((n) => ['bank', 'telecom'].includes(n.kind))
  const held = state.recovery.filter((r) => r.status === 'ESCROW_HELD')

  const receiptPdf = (r) => {
    const x = r.receipt
    downloadBlob(`${x.no}.pdf`, buildPdf('NDSIR Restitution Receipt', [
      { text: 'NDSIR - ASSET RESTITUTION RECEIPT', bold: true, size: 14 }, `Receipt No : ${x.no}`, `Issued     : ${fmtDateTime(x.issuedAt)}`, '',
      `Beneficiary: ${x.beneficiary || 'Victim'}  (${x.nid || 'NID on file'})`, `Amount     : ${etb(x.amount)}`, `Released from mule account ${x.account} (${r.holder}) at ${r.inst}`,
      `Freeze order ${x.orderId} / gateway ref ${x.gatewayRef}`, '', `Receipt SHA-256: ${x.hash}`, `HMAC signature : ${x.sig}`, '', 'Signed with the NDSIR demo key. Production signing is performed server-side.',
    ]))
    actions.audit('bank', 'RECEIPT_DOWNLOADED', `Restitution receipt ${x.no} downloaded`)
  }

  const tabs = [
    { id: 'queue', label: 'Priority Freeze Queue', icon: Lock, count: pending.length },
    { id: 'gateway', label: 'Gateway Telemetry & API Status', icon: Activity },
    { id: 'ledger', label: 'Asset Recovery Ledger', icon: Landmark, count: state.recovery.length },
  ]

  return (
    <PortalShell>
      <PortalHeader accent="blue" icon={Building} kicker="COMMERCIAL BANK NODE — SECURITY OPERATIONS" title="Institutional Asset Protection & Emergency Freeze Portal" tabs={tabs} active={tab} onTab={setTab}
        right={<span className="px-3.5 py-1.5 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-xs text-emerald-400 font-bold flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" /> Webhook Listener Active</span>} />
      <FlashBanner accent="blue">{flashMsg}</FlashBanner>

      <main className="max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="Total Frozen Assets" value={etb(frozenTotal)} tone="text-white" sub={`${state.orders.filter((o) => o.status === 'FROZEN_SECURED').length} accounts under hard freeze`} />
          <StatCard label="Avg Freeze Latency" value={fmtDuration(sla.avgMs)} sub={`SLA target: ≤ ${SLA_TARGET_MS / 1000}s from dispatch`} />
          <StatCard label="Pending Executions" value={pending.length} tone={sla.breachedPending ? 'text-rose-400' : 'text-amber-400'} sub={sla.breachedPending ? `${sla.breachedPending} past SLA!` : 'Inside SLA window'} />
          <StatCard label="Compliance Adherence" value={`${sla.withinPct}%`} tone="text-emerald-400" sub="Freezes executed within SLA" />
        </div>

        {tab === 'queue' && (
          <Panel>
            <PanelTitle title="Priority Freeze Queue" sub="Live national command orders — execute with dual-control PIN, or clear a false positive and restore the account"
              right={
                <div className="flex flex-wrap items-center gap-2">
                  {['all', ...INSTITUTIONS.map((i) => i.key)].map((k) => (
                    <button key={k} onClick={() => setFilter(k)} className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase cursor-pointer ${filter === k ? 'bg-blue-950 text-blue-300 border border-blue-500' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'}`}>{k}</button>
                  ))}
                </div>
              } />
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Order</th><th className="py-3 px-4">Target Account</th><th className="py-3 px-4">Holder</th><th className="py-3 px-4">Amount</th><th className="py-3 px-4">Origin</th><th className="py-3 px-4">SLA Clock</th><th className="py-3 px-4">Status</th><th className="py-3 px-4 text-right">Officer Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {orders.length === 0 && <tr><td colSpan={8}><Empty>Queue is empty. Orders appear here the moment an analyst dispatches a freeze.</Empty></td></tr>}
                  {orders.map((o) => {
                    const elapsed = (o.executedAt || (o.status === 'PENDING_EXECUTION' ? now : o.dispatchedAt)) - o.dispatchedAt
                    const breach = elapsed > SLA_TARGET_MS
                    return (
                      <tr key={o.id} className="hover:bg-slate-900/60 transition-colors align-top">
                        <td className="py-4 px-4"><span className="font-bold text-blue-400">{o.id}</span><div className="mt-1"><Pill status={o.severity} /></div><p className="text-[10px] text-slate-500 mt-1">{o.incidentId || o.warrantId}</p></td>
                        <td className="py-4 px-4 text-white font-mono">{o.account}<p className="text-[10px] text-slate-500 font-sans">{o.inst}</p></td>
                        <td className="py-4 px-4 text-slate-300">{o.holder}</td>
                        <td className="py-4 px-4 text-cyan-300 font-bold">{etb(o.amount)}</td>
                        <td className="py-4 px-4 text-slate-400">{o.source}<p className="text-[10px] text-slate-600">{fmtTime(o.dispatchedAt)}</p></td>
                        <td className={`py-4 px-4 font-mono ${breach ? 'text-rose-400 font-bold' : 'text-slate-300'}`}>{o.status === 'RESTORED_FALSE_POSITIVE' ? '—' : fmtDuration(elapsed)}{breach && o.status === 'PENDING_EXECUTION' && <p className="text-[10px]">SLA BREACH</p>}</td>
                        <td className="py-4 px-4"><Pill status={o.status} pulse />{o.gatewayRef && <p className="mt-1 text-[10px] font-mono text-emerald-400">{o.gatewayRef}</p>}{o.ack && <p className="text-[10px] text-slate-500">ACK sent to command</p>}</td>
                        <td className="py-4 px-4 text-right">
                          {o.status === 'PENDING_EXECUTION' ? (
                            <div className="flex justify-end gap-2">
                              <button onClick={() => setExec(o)} className="px-3 py-1 bg-rose-950 border border-rose-500/50 hover:bg-rose-900 text-rose-300 font-bold rounded-lg cursor-pointer text-[10px] shadow-md">Execute Freeze</button>
                              <button onClick={() => { setRestore(o); setReason('') }} className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg cursor-pointer text-[10px]">Clear / False Positive</button>
                            </div>
                          ) : o.status === 'FROZEN_SECURED' ? (
                            <button onClick={() => { setRestore(o); setReason('') }} className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg cursor-pointer text-[10px] inline-flex items-center gap-1"><RotateCcw className="h-3 w-3" /> Restore Account</button>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">Logged & Locked{o.restoreReason ? ` — ${o.restoreReason}` : ''}</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {tab === 'gateway' && (
          <Panel>
            <PanelTitle icon={Activity} accent="blue" title="Gateway Telemetry & API Status" sub="Live latency and health of the national switches. An Administrator kill-switch isolates a node and blocks freezes routed through it." />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {gatewayNodes.map((n) => {
                const isolated = n.status === 'ISOLATED'
                return (
                  <div key={n.id} className={`rounded-2xl border p-5 space-y-3 ${isolated ? 'border-rose-500/50 bg-rose-950/20' : 'border-slate-800 bg-slate-900/60'}`}>
                    <div className="flex justify-between items-start">
                      <div><p className="text-sm font-bold text-white">{n.name}</p><Mono>{n.id} · {n.region}</Mono></div>
                      {isolated ? <WifiOff className="h-5 w-5 text-rose-400" /> : <Wifi className="h-5 w-5 text-emerald-400" />}
                    </div>
                    <div className="flex items-end justify-between">
                      <div><p className={`text-3xl font-black ${isolated ? 'text-rose-400' : 'text-white'}`}>{isolated ? 'OFFLINE' : `${n.latency} ms`}</p><p className="text-[10px] text-slate-500">uptime {n.uptime}% · {n.requests} freeze calls · {n.acks} ACKs</p></div>
                      <Sparkline values={n.history} color={isolated ? '#f43f5e' : '#22d3ee'} />
                    </div>
                    <div className="flex items-center justify-between"><Pill status={n.status} />{isolated && <span className="text-[10px] text-rose-400">Severed by Administrator — freezes cannot be committed</span>}</div>
                  </div>
                )
              })}
            </div>
          </Panel>
        )}

        {tab === 'ledger' && (
          <Panel>
            <PanelTitle icon={Landmark} accent="blue" title="Asset Recovery Ledger" sub="Mule-account tracking and victim restitution"
              right={<div className="flex gap-2 text-[11px]"><span className="px-3 py-1 rounded-xl bg-amber-950/60 border border-amber-500/30 text-amber-400 font-bold">In escrow {etb(held.reduce((a, r) => a + r.amount, 0))}</span><span className="px-3 py-1 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 font-bold">Restituted {etb(state.recovery.filter((r) => r.status === 'RESTITUTED').reduce((a, r) => a + r.amount, 0))}</span></div>} />
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead><tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider"><th className="py-3 px-4">Ledger</th><th className="py-3 px-4">Mule Account</th><th className="py-3 px-4">Victim Beneficiary</th><th className="py-3 px-4">Amount</th><th className="py-3 px-4">Gateway Ref</th><th className="py-3 px-4">Status</th><th className="py-3 px-4 text-right">Restitution</th></tr></thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {state.recovery.length === 0 && <tr><td colSpan={7}><Empty>No frozen assets yet.</Empty></td></tr>}
                  {state.recovery.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-900/60 align-top">
                      <td className="py-4 px-4 font-bold text-blue-400">{r.id}<p className="text-[10px] text-slate-500">{r.orderId} · {fmtDateTime(r.heldAt)}</p></td>
                      <td className="py-4 px-4 font-mono text-white">{r.account}<p className="text-[10px] text-slate-500 font-sans">{r.holder} · {r.inst}</p></td>
                      <td className="py-4 px-4 text-slate-300">{r.victimName || 'Unidentified'}<p className="text-[10px] text-slate-500 font-mono">{r.victimNid || ''}</p></td>
                      <td className="py-4 px-4 text-cyan-300 font-bold">{etb(r.amount)}</td>
                      <td className="py-4 px-4 font-mono text-emerald-400">{r.gatewayRef}</td>
                      <td className="py-4 px-4"><Pill status={r.status} /></td>
                      <td className="py-4 px-4 text-right">
                        {r.status === 'ESCROW_HELD' && <Btn accent="blue" className="ml-auto" onClick={() => { actions.issueRestitution(r.id); flash(`Restitution receipt generated for ${r.victimName || 'victim'}.`) }}><FileText className="h-3.5 w-3.5" /> Generate Receipt</Btn>}
                        {r.status === 'RESTITUTED' && r.receipt && <Btn variant="ok" className="ml-auto" onClick={() => receiptPdf(r)}><Download className="h-3.5 w-3.5" /> {r.receipt.no}</Btn>}
                        {r.status === 'RELEASED' && <span className="text-[10px] text-slate-500 italic">Released — false positive</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </main>

      <PinModal open={!!exec} onClose={() => setExec(null)} accent="blue" title="Dual-Control Freeze Authorization" demoPin={PINS.bank} confirmLabel="Commit Hard Freeze"
        description={<>Committing a hard freeze on <span className="text-white font-mono">{exec?.account}</span> ({exec?.holder}, {etb(exec?.amount)}) for order <span className="text-white font-bold">{exec?.id}</span> requires your 4-digit officer PIN. A secure gateway reference will be generated and an ACK returned to the command network.</>}
        onConfirm={(pin) => {
          const res = actions.executeFreeze(exec.id, pin)
          if (res.ok) flash(`Asset freeze executed for ${exec.id}. ACK transmitted to the command network and logged to the immutable audit trail.`)
          return res
        }} />

      <PinModal open={!!restore} onClose={() => setRestore(null)} accent="blue" title="False-Positive Restoration Protocol" demoPin={PINS.bank} confirmLabel="Restore Account"
        description={<>Restore <span className="text-white font-mono">{restore?.account}</span> to normal standing and cancel order <span className="text-white font-bold">{restore?.id}</span>. This is recorded permanently in the audit trail.</>}
        onConfirm={(pin) => {
          if (reason.trim().length < 5) return { ok: false, error: 'Enter a restoration reason (min 5 characters).' }
          const res = actions.restoreOrder(restore.id, reason.trim(), pin)
          if (res.ok) flash(`Order ${restore.id} cleared as false positive. Account restored to normal standing.`)
          return res
        }}>
        <Field label="Restoration reason"><textarea rows={2} className={inputCls('blue')} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. KYC re-verified, legitimate merchant settlement" /></Field>
      </PinModal>
    </PortalShell>
  )
}
