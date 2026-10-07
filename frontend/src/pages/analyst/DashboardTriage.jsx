import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Search, ArrowRight, Activity, AlertTriangle } from 'lucide-react'
import { useIncidents } from '../../context/IncidentContext'

export default function DashboardTriage() {
  const { incidents } = useIncidents()
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const filteredIncidents = incidents.filter((item) => {
    const matchesFilter =
      filter === 'ALL' ||
      (filter === 'CRITICAL' && item.riskScore >= 90) ||
      (filter === 'HIGH' && item.riskScore < 90 && item.riskScore >= 80)

    const matchesSearch =
      item.id.toLowerCase().includes(search.toLowerCase()) ||
      item.source.toLowerCase().includes(search.toLowerCase()) ||
      item.destination.toLowerCase().includes(search.toLowerCase())

    return matchesFilter && matchesSearch
  })

  return (
    <div className="p-6 space-y-6 font-mono bg-[#030712] text-slate-100 min-h-screen">
      {/* Top Telemetry KPI Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="cyber-card p-4 border-l-4 border-cyan-500">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">ACTIVE INTERCEPTS (24H)</div>
          <div className="text-2xl font-bold text-white mt-1 flex items-baseline justify-between">
            <span>1,482</span>
            <span className="text-xs text-emerald-400 font-normal">+12% vs avg</span>
          </div>
        </div>

        <div className="cyber-card p-4 border-l-4 border-red-500">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">ETHSWITCH HOLDS DISPATCHED</div>
          <div className="text-2xl font-bold text-red-500 mt-1 flex items-baseline justify-between">
            <span>341</span>
            <span className="text-xs text-cyan-400 font-normal">99.2% SLA</span>
          </div>
        </div>

        <div className="cyber-card p-4 border-l-4 border-cyan-500">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">INTERCEPTED VOLUME</div>
          <div className="text-2xl font-bold text-cyan-400 mt-1 flex items-baseline justify-between">
            <span>ETB 42.8M</span>
            <span className="text-xs text-slate-400 font-normal">Today</span>
          </div>
        </div>

        <div className="cyber-card p-4 border-l-4 border-emerald-500">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">SYSTEM STATUS</div>
          <div className="text-sm font-bold text-emerald-400 mt-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <span>LIVE // ETHSWITCH GATEWAY</span>
          </div>
        </div>
      </div>

      {/* Main Incident Triage Table */}
      <div className="cyber-card p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm tracking-wider">
            <Shield className="h-4 w-4" />
            <span>HIGH-PRIORITY INCIDENT TRIAGE QUEUE</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search case, bank, entity..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 pl-8 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 w-64"
              />
            </div>

            {/* Severity Filters */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 border border-slate-800 rounded text-xs">
              {['ALL', 'CRITICAL', 'HIGH'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFilter(mode)}
                  className={`px-2.5 py-1 rounded font-bold transition-colors ${
                    filter === mode
                      ? 'bg-cyan-500 text-black'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-slate-800">
                <th className="pb-3 font-semibold">INCIDENT CASE</th>
                <th className="pb-3 font-semibold">SOURCE → DESTINATION</th>
                <th className="pb-3 font-semibold">VALUE</th>
                <th className="pb-3 font-semibold">VELOCITY</th>
                <th className="pb-3 font-semibold">RISK SCORE</th>
                <th className="pb-3 font-semibold">CLEARANCE</th>
                <th className="pb-3 font-semibold text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredIncidents.map((item) => (
                <tr key={item.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-3 font-bold text-white">
                    {item.id}
                    <div className="text-[10px] text-slate-500 font-normal">{item.timestamp}</div>
                  </td>
                  <td className="py-3 text-slate-300 font-medium">{item.source} → {item.destination}</td>
                  <td className="py-3 text-red-400 font-bold">ETB {item.value.toLocaleString()}</td>
                  <td className="py-3 text-slate-400">{item.velocity}</td>
                  <td className="py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.riskScore >= 90
                          ? 'bg-red-950 text-red-400 border border-red-800'
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}
                    >
                      {item.riskScore} / 100
                    </span>
                  </td>
                  <td className="py-3">
                    <span
                      className={`font-bold ${
                        item.clearance === 'HOLD_ACTIVE'
                          ? 'text-emerald-400'
                          : item.clearance === 'IN_REVIEW'
                          ? 'text-amber-400'
                          : 'text-red-400'
                      }`}
                    >
                      {item.clearance}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => navigate('/console/linkage')}
                      className="bg-slate-900 hover:bg-cyan-500 hover:text-black border border-slate-700 hover:border-cyan-400 px-3 py-1.5 rounded font-bold text-[11px] transition-all flex items-center gap-1 ml-auto"
                    >
                      <span>GRAPH ANALYZE</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
