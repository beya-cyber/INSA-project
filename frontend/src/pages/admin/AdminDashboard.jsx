// src/pages/admin/AdminDashboard.jsx
// System Administrator portal — infrastructure & security core.
// Live telemetry fed by the shared store: gateway calls/ACKs/failures from Analyst, Bank and Police,
// PIN brute-force flags, and node state. The kill switch really affects the other portals:
// an ISOLATED node blocks freeze dispatch (Analyst), execution (Bank) and warrant service (Police).
import React, { useMemo, useState } from 'react'
import { Server, Users, ShieldAlert, Activity, Power, RefreshCw, Plus, Ban, Lock, Siren, KeyRound, Terminal, ShieldCheck, ArrowUp, ArrowDown, ClipboardCheck } from 'lucide-react'
import { useNdsir } from '../../context/NdsirContext'
import { PERMISSIONS, ROLE_PERMS, ROLE_LABELS } from '../../store/ndsirStore'
import { fmtDateTime, fmtTime } from '../../lib/format'
import { PortalShell, PortalHeader, FlashBanner, useFlash, Panel, PanelTitle, StatCard, Pill, Btn, Mono, Empty, Modal, Field, inputCls, Sparkline } from '../../components/portal/ui'

const BLANK_USER = { id: '', name: '', role: '', portal: 'analyst', agency: '', tier: 2 }

export default function AdminDashboard() {
  const { state, actions } = useNdsir()
  const [flashMsg, flash] = useFlash()
  const [tab, setTab] = useState('nodes')
  const [isolate, setIsolate] = useState(null)
  const [reason, setReason] = useState('')
  const [resetOpen, setResetOpen] = useState(false)
  const [resetText, setResetText] = useState('')
  const [userOpen, setUserOpen] = useState(false)
  const [form, setForm] = useState(BLANK_USER)
  const [formError, setFormError] = useState(null)
  const [wafFilter, setWafFilter] = useState('ALL')

  const online = state.nodes.filter((n) => n.status !== 'ISOLATED').length
  const isolated = state.nodes.length - online
  const sysFailures = state.sysEvents.filter((e) => e.level === 'CRIT').length
  const wafShown = state.waf.filter((w) => wafFilter === 'ALL' || w.type === wafFilter)
  const wafTypes = useMemo(() => ['ALL', ...Array.from(new Set(state.waf.map((w) => w.type)))], [state.waf])
  const threat = isolated > 0 || sysFailures > 2 ? 'DEFCON 2' : 'DEFCON 4'

  const submitUser = (e) => {
    e.preventDefault()
    if (!/^[A-Z]{3}-\d{5}-ET$/.test(form.id.trim())) return setFormError('Institutional ID must look like INS-12345-ET.')
    if (!form.name.trim() || !form.role.trim() || !form.agency.trim()) return setFormError('Name, role and agency are required.')
    if (state.users.some((u) => u.id === form.id.trim())) return setFormError('That institutional ID is already provisioned.')
    actions.provisionUser({ ...form, id: form.id.trim(), name: form.name.trim(), role: form.role.trim(), agency: form.agency.trim(), tier: Number(form.tier) })
    setUserOpen(false); setForm(BLANK_USER); setFormError(null)
    flash(`User ${form.id.trim()} provisioned.`)
  }

  const tabs = [
    { id: 'nodes', label: 'Cluster Node Health', icon: Server, count: state.nodes.length },
    { id: 'waf', label: 'WAF & Threat Mitigation', icon: ShieldAlert, count: state.waf.length },
    { id: 'rbac', label: 'RBAC Security Matrix', icon: Users, count: state.users.length },
  ]

  return (
    <PortalShell>
      <PortalHeader accent="indigo" icon={Terminal} kicker="SYSTEM GOVERNANCE — ADMINISTRATOR COMMAND" title="Infrastructure & Security Core" tabs={tabs} active={tab} onTab={setTab}
        right={<Btn variant="danger" onClick={() => { setResetText(''); setResetOpen(true) }}><Siren className="h-3.5 w-3.5" /> Global Security Reset</Btn>} />
      <FlashBanner accent="indigo">{flashMsg}</FlashBanner>

      <main className="max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="Nodes Online" value={`${online} / ${state.nodes.length}`} icon={Server} tone={isolated ? 'text-amber-400' : 'text-white'} sub={isolated ? `${isolated} isolated by kill switch` : 'All national nodes reachable'} />
          <StatCard label="Threats Mitigated" value={state.waf.length} icon={ShieldAlert} tone="text-emerald-400" sub={`${state.blocklist.length} IPs permanently blocked`} />
          <StatCard label="Gateway Failures" value={sysFailures} icon={Activity} tone={sysFailures ? 'text-rose-400' : 'text-white'} sub="Critical events from Analyst / Bank / Police" />
          <StatCard label="Threat Level" value={threat} icon={Activity} tone={threat === 'DEFCON 2' ? 'text-rose-400' : 'text-blue-400'} sub={`Session epoch #${state.epoch}`} />
        </div>

        {tab === 'nodes' && (
          <>
            <Panel>
              <PanelTitle accent="indigo" icon={Server} title="National Command Nodes" sub="Uptime, latency and kill switch for API gateways, core hubs and redundant backups across Ethiopia" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {state.nodes.map((n) => {
                  const iso = n.status === 'ISOLATED'
                  return (
                    <div key={n.id} className={`rounded-2xl border p-4 space-y-3 ${iso ? 'border-rose-500/50 bg-rose-950/20' : 'border-slate-800 bg-[#020617]'}`}>
                      <div className="flex justify-between items-start gap-2">
                        <div><p className="font-bold text-white text-xs">{n.name}</p><Mono>{n.id} · {n.type} · {n.region}</Mono></div>
                        <Pill status={n.status} />
                      </div>
                      <div className="flex items-end justify-between">
                        <div><p className={`text-2xl font-black ${iso ? 'text-rose-400' : 'text-white'}`}>{iso ? 'OFFLINE' : `${n.latency} ms`}</p><p className="text-[10px] text-slate-500">uptime {n.uptime}%{n.inst ? ` · ${n.requests} calls · ${n.acks} ACKs` : ''}</p></div>
                        <Sparkline values={n.history} color={iso ? '#f43f5e' : '#818cf8'} />
                      </div>
                      <div className="flex justify-end">
                        {iso ? <Btn variant="ok" onClick={() => { actions.restoreNode(n.id); flash(`${n.id} re-integrated into the command network.`) }}><RefreshCw className="h-3.5 w-3.5" /> Restore Node</Btn>
                          : <Btn variant="danger" onClick={() => { setIsolate(n); setReason('') }}><Power className="h-3.5 w-3.5" /> Isolate / Kill Switch</Btn>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Panel>
            <Panel>
              <PanelTitle accent="indigo" icon={Activity} title="Live Command-Network Telemetry" sub="Events emitted by the other portals in real time" />
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {state.sysEvents.map((e) => (
                  <div key={e.id} className="flex items-start gap-3 text-[11px] bg-slate-900/50 border border-slate-800/70 rounded-lg px-3 py-2">
                    <span className="font-mono text-slate-500 shrink-0">{fmtTime(e.ts)}</span><Pill status={e.level} />
                    <span className="text-indigo-300 font-mono shrink-0">{e.source}</span><span className="text-slate-300">{e.message}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </>
        )}

        {tab === 'waf' && (
          <Panel>
            <PanelTitle accent="indigo" icon={ShieldAlert} title="WAF & Threat Mitigation" sub="Blocked SQL injections, DDoS floods and brute-force attempts — including PIN brute-force flags raised by the institutional portals"
              right={<select value={wafFilter} onChange={(e) => setWafFilter(e.target.value)} className={`${inputCls('indigo')} md:w-56`}>{wafTypes.map((t) => <option key={t}>{t}</option>)}</select>} />
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead><tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider"><th className="py-3 px-4">Time</th><th className="py-3 px-4">Type</th><th className="py-3 px-4">Detail</th><th className="py-3 px-4">Source</th><th className="py-3 px-4">Rule</th><th className="py-3 px-4">Action</th><th className="py-3 px-4 text-right">Mitigate</th></tr></thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {wafShown.length === 0 && <tr><td colSpan={7}><Empty>No events.</Empty></td></tr>}
                  {wafShown.map((w) => {
                    const blocked = state.blocklist.includes(w.srcIp)
                    const internal = w.srcIp === 'internal-session'
                    return (
                      <tr key={w.id} className="hover:bg-slate-900/60">
                        <td className="py-3 px-4 font-mono text-slate-400">{fmtTime(w.ts)}</td>
                        <td className="py-3 px-4"><span className="font-bold text-white">{w.type}</span><div className="mt-1"><Pill status={w.severity} /></div></td>
                        <td className="py-3 px-4 text-slate-300">{w.detail}</td>
                        <td className="py-3 px-4 font-mono text-rose-300">{w.srcIp}</td>
                        <td className="py-3 px-4 font-mono text-[10px] text-slate-500">{w.rule}</td>
                        <td className="py-3 px-4"><Pill status={w.action} /></td>
                        <td className="py-3 px-4 text-right">{internal ? <span className="text-[10px] text-slate-500">review user in RBAC</span> : blocked ? <span className="text-[10px] text-emerald-400">Blocklisted</span> : <Btn variant="danger" className="ml-auto" onClick={() => { actions.blockIp(w.srcIp); flash(`${w.srcIp} added to permanent blocklist.`) }}><Ban className="h-3.5 w-3.5" /> Block IP</Btn>}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {tab === 'rbac' && (
          <>
            <Panel>
              <PanelTitle accent="indigo" icon={Users} title="Identity & Clearance Management" sub="Provision, suspend, audit and elevate institutional users (clearance Tier 1–5). Every change is written to the immutable audit trail."
                right={<Btn accent="indigo" onClick={() => { setForm(BLANK_USER); setFormError(null); setUserOpen(true) }}><Plus className="h-3.5 w-3.5" /> Add User</Btn>} />
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead><tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider"><th className="py-3 px-4">User</th><th className="py-3 px-4">Role & Agency</th><th className="py-3 px-4">Clearance</th><th className="py-3 px-4">Status</th><th className="py-3 px-4">Last access review</th><th className="py-3 px-4 text-right">Controls</th></tr></thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {state.users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-900/60">
                        <td className="py-3 px-4"><span className="font-bold text-white block">{u.name}</span><Mono>{u.id}</Mono></td>
                        <td className="py-3 px-4"><span className="text-indigo-300 block">{u.role}</span><span className="text-[10px] text-slate-500">{u.agency}</span></td>
                        <td className="py-3 px-4"><span className="font-mono bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md text-slate-200">Tier {u.tier}</span></td>
                        <td className="py-3 px-4"><Pill status={u.status} /></td>
                        <td className="py-3 px-4 text-[11px] text-slate-500">{u.lastAudit ? fmtDateTime(u.lastAudit) : 'never'}</td>
                        <td className="py-3 px-4"><div className="flex flex-wrap justify-end gap-1.5">
                          <Btn variant="ghost" title="Elevate clearance" disabled={u.tier >= 5} onClick={() => actions.userAction(u.id, 'elevate')}><ArrowUp className="h-3.5 w-3.5" /></Btn>
                          <Btn variant="ghost" title="Reduce clearance" disabled={u.tier <= 1} onClick={() => actions.userAction(u.id, 'demote')}><ArrowDown className="h-3.5 w-3.5" /></Btn>
                          <Btn variant="ghost" title="Audit access" onClick={() => { actions.userAction(u.id, 'audit'); flash(`Access review recorded for ${u.id}.`) }}><ClipboardCheck className="h-3.5 w-3.5" /></Btn>
                          {u.status === 'ACTIVE' ? <Btn variant="danger" onClick={() => actions.userAction(u.id, 'suspend')}><Lock className="h-3.5 w-3.5" /> Suspend</Btn> : <Btn variant="ok" onClick={() => actions.userAction(u.id, 'reactivate')}>Reactivate</Btn>}
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
            <Panel>
              <PanelTitle accent="indigo" icon={KeyRound} title="Permission Matrix" sub="Granular capability grants per portal role" />
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead><tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider"><th className="py-3 px-4">Capability</th>{Object.keys(ROLE_PERMS).map((r) => <th key={r} className="py-3 px-3 text-center">{ROLE_LABELS[r].split(' ')[0]}</th>)}</tr></thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {PERMISSIONS.map(([key, label]) => (
                      <tr key={key}><td className="py-2.5 px-4 text-slate-300">{label}</td>{Object.entries(ROLE_PERMS).map(([r, perms]) => <td key={r} className="text-center">{perms.includes(key) ? <ShieldCheck className="h-4 w-4 text-emerald-400 inline" aria-label="granted" /> : <span className="text-slate-700">—</span>}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </>
        )}
      </main>

      <Modal open={!!isolate} onClose={() => setIsolate(null)} title="Emergency Node Isolation" icon={Power} accent="rose">
        <div className="space-y-3 text-xs">
          <p className="text-slate-300">Isolating <b className="text-white">{isolate?.name}</b> (<span className="font-mono">{isolate?.id}</span>) severs it from the national command network.{isolate?.inst && <> Freeze dispatch, execution and warrant service routed through it will be <b className="text-rose-300">blocked</b>.</>}</p>
          <Field label="Reason (recorded in the audit trail)"><input className={inputCls('rose')} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. rogue API integration detected" /></Field>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-800"><Btn variant="ghost" onClick={() => setIsolate(null)}>Cancel</Btn>
            <Btn variant="danger" disabled={reason.trim().length < 5} onClick={() => { actions.isolateNode(isolate.id, reason.trim()); flash(`${isolate.id} isolated. Dependent gateways are now blocked.`); setIsolate(null) }}><Power className="h-3.5 w-3.5" /> Sever Node</Btn></div>
        </div>
      </Modal>

      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Global Security Reset" icon={Siren} accent="rose">
        <div className="space-y-3 text-xs">
          <p className="text-slate-300">Invalidates every institutional session platform-wide and forces re-authentication. Type <b className="text-white font-mono">RESET</b> to confirm.</p>
          <input className={inputCls('rose')} value={resetText} onChange={(e) => setResetText(e.target.value)} />
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-800"><Btn variant="ghost" onClick={() => setResetOpen(false)}>Cancel</Btn>
            <Btn variant="danger" disabled={resetText !== 'RESET'} onClick={() => { actions.globalReset(); setResetOpen(false); flash('Global security reset issued. All other sessions must re-authenticate.') }}>Execute Reset</Btn></div>
        </div>
      </Modal>

      <Modal open={userOpen} onClose={() => setUserOpen(false)} title="Provision Institutional User" icon={Plus} accent="indigo" wide>
        <form onSubmit={submitUser} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Institutional ID"><input className={inputCls('indigo')} placeholder="INS-12345-ET" value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value.toUpperCase() })} /></Field>
            <Field label="Full name"><input className={inputCls('indigo')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Role title"><input className={inputCls('indigo')} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} /></Field>
            <Field label="Agency"><input className={inputCls('indigo')} value={form.agency} onChange={(e) => setForm({ ...form, agency: e.target.value })} /></Field>
            <Field label="Portal"><select className={inputCls('indigo')} value={form.portal} onChange={(e) => setForm({ ...form, portal: e.target.value })}>{Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
            <Field label="Clearance tier"><select className={inputCls('indigo')} value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })}>{[1, 2, 3, 4, 5].map((t) => <option key={t} value={t}>Tier {t}</option>)}</select></Field>
          </div>
          {formError && <p className="text-rose-400 text-[11px]">{formError}</p>}
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-800"><Btn variant="ghost" onClick={() => setUserOpen(false)}>Cancel</Btn><button type="submit" className="px-4 py-2 rounded-xl text-xs bg-indigo-950 border border-indigo-500/50 hover:bg-indigo-900 text-indigo-300 font-bold cursor-pointer">Provision</button></div>
        </form>
      </Modal>
    </PortalShell>
  )
}
