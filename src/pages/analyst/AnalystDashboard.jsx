import React, { useState } from 'react'
import CommandHeader from '../../components/CommandHeader'
import { ShieldAlert, Zap, Filter, Lock, ArrowUpRight, CheckCircle2, Cpu } from 'lucide-react'

export default function AnalystDashboard() {
  const [selectedCase, setSelectedCase] = useState(null)

  const incidents = [
    { id: 'INC-2026-8891', source: 'CBE Mobile', target: 'Telebirr 0911****82', amount: '450,000 ETB', severity: 'CRITICAL', score: 98, status: 'SUSPENDED', time: '2 mins ago' },
    { id: 'INC-2026-8892', source: 'BOA Online', target: 'CBE 1000****928', amount: '120,000 ETB', severity: 'HIGH', score: 84, status: 'UNDER REVIEW', time: '5 mins ago' },
    { id: 'INC-2026-8893', source: 'Dashen Bank', target: 'Telebirr 0922****10', amount: '89,000 ETB', severity: 'MEDIUM', score: 62, status: 'MONITORED', time: '12 mins ago' },
  ]

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col font-sans">
      <CommandHeader portalTitle="ANALYST FRAUD TRIAGE & REAL-TIME INCIDENT COMMAND" badgeId="ANALYST-T1-INSA" />

      <main className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1700px] mx-auto w-full">
        <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#0b1329] border border-rose-900/40 p-4 rounded-2xl">
            <p className="text-[11px] font-mono text-slate-400 font-bold uppercase">CRITICAL ALERTS</p>
            <h3 className="text-2xl font-black text-rose-400 mt-1">14 ACTIVE</h3>
            <p className="mt-2 text-[10px] font-mono text-rose-300/80 flex items-center gap-1">
              <Zap className="h-3 w-3" /> EthSwitch core telemetry online
            </p>
          </div>

          <div className="bg-[#0b1329] border border-cyan-900/40 p-4 rounded-2xl">
            <p className="text-[11px] font-mono text-slate-400 font-bold uppercase">HOLDS EXECUTED</p>
            <h3 className="text-2xl font-black text-cyan-400 mt-1">1,240,000 ETB</h3>
            <p className="mt-2 text-[10px] font-mono text-cyan-300/80">Across 12 commercial banking nodes</p>
          </div>

          <div className="bg-[#0b1329] border border-amber-900/40 p-4 rounded-2xl">
            <p className="text-[11px] font-mono text-slate-400 font-bold uppercase">AVG RESOLUTION SPEED</p>
            <h3 className="text-2xl font-black text-amber-400 mt-1">1.4 MINUTES</h3>
            <p className="mt-2 text-[10px] font-mono text-amber-300/80">SLA Enforcement: 99.4%</p>
          </div>

          <div className="bg-[#0b1329] border border-emerald-900/40 p-4 rounded-2xl">
            <p className="text-[11px] font-mono text-slate-400 font-bold uppercase">AI ACCURACY INDEX</p>
            <h3 className="text-2xl font-black text-emerald-400 mt-1">99.8%</h3>
            <p className="mt-2 text-[10px] font-mono text-emerald-300/80">Zero false positive lockdown active</p>
          </div>
        </div>

        <div className="lg:col-span-8 bg-[#0b1329] border border-slate-800 rounded-3xl p-6 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              Live Anomaly Stream & Risk Triage
            </h2>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {incidents.map((inc) => (
              <div 
                key={inc.id}
                onClick={() => setSelectedCase(inc)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-wrap justify-between items-center gap-4 ${
                  selectedCase?.id === inc.id 
                    ? 'bg-cyan-950/40 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.15)]' 
                    : 'bg-[#020617]/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div>
                  <span className="font-bold text-white block">{inc.id}</span>
                  <span className="text-[10px] text-slate-400">{inc.source} → {inc.target}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">AMOUNT</span>
                  <span className="text-white font-bold">{inc.amount}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">ANOMALY INDEX</span>
                  <span className={`font-bold ${inc.score > 90 ? 'text-rose-400' : 'text-amber-400'}`}>{inc.score}/100</span>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                  inc.status === 'SUSPENDED' ? 'bg-rose-950/60 border-rose-800 text-rose-300' : 'bg-amber-950/60 border-amber-800 text-amber-300'
                }`}>
                  {inc.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 bg-[#0b1329] border border-slate-800 rounded-3xl p-6 flex flex-col justify-between shadow-2xl">
          <div>
            <h2 className="text-base font-bold text-white mb-4">Command Actions</h2>
            {selectedCase ? (
              <div className="space-y-4 font-mono text-xs">
                <div className="p-4 bg-[#020617] border border-slate-800 rounded-2xl space-y-2">
                  <span className="text-[10px] text-slate-500 uppercase">SELECTED TARGET</span>
                  <p className="text-sm font-bold text-cyan-400">{selectedCase.id}</p>
                  <p className="text-slate-300">Route: {selectedCase.source} → {selectedCase.target}</p>
                </div>
                <button className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg">
                  <Lock className="h-4 w-4" /> EXECUTE EMERGENCY HOLD
                </button>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 font-mono text-xs border border-dashed border-slate-800 rounded-2xl">
                Select an anomaly row from the live feed to initialize defensive override actions.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
