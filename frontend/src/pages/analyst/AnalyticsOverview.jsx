import React from 'react'
import { BarChart3, TrendingUp, ShieldCheck, Zap, Layers, Globe } from 'lucide-react'

export default function AnalyticsOverview() {
  return (
    <div className="p-6 space-y-6 font-mono bg-[#030712] text-slate-100 min-h-screen">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
        <div>
          <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5" />
            <span>INSA // NATIONAL THREAT METRICS</span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1">FRAUD VELOCITY & NETWORK METRICS</h1>
        </div>
        <div className="text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded border border-slate-800 flex items-center gap-2">
          <Globe className="h-4 w-4 text-cyan-400" />
          <span>ALL ETHIOPIAN BANKING NODES SYNCED</span>
        </div>
      </div>

      {/* High Level KPI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="cyber-card p-5 space-y-2">
          <span className="text-[10px] text-slate-400 font-bold uppercase">AVG INTERCEPT SPEED</span>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold text-cyan-400">38.4s</span>
            <span className="text-xs text-emerald-400 font-bold">↓ 14% vs last week</span>
          </div>
          <p className="text-[10px] text-slate-500">EthSwitch gateway hold confirmation time</p>
        </div>

        <div className="cyber-card p-5 space-y-2">
          <span className="text-[10px] text-slate-400 font-bold uppercase">SAVED CAPITAL (MONTHLY)</span>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold text-emerald-400">ETB 184.2M</span>
            <span className="text-xs text-emerald-400 font-bold">+28%</span>
          </div>
          <p className="text-[10px] text-slate-500">Recovered fraud assets frozen prior to cashout</p>
        </div>

        <div className="cyber-card p-5 space-y-2">
          <span className="text-[10px] text-slate-400 font-bold uppercase">IDENTIFIED MULE NETWORKS</span>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold text-red-500">89 CLUSTERS</span>
            <span className="text-xs text-red-400 font-bold">12 Active</span>
          </div>
          <p className="text-[10px] text-slate-500">Multi-hop money laundering rings mapped</p>
        </div>
      </div>

      {/* Analytics Breakdown Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="cyber-card p-5 space-y-4">
          <h3 className="text-xs font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-cyan-400" />
            <span>INCIDENT VOLUME BY FINANCIAL INSTITUTION</span>
          </h3>
          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between py-1 text-slate-300">
                <span>Commercial Bank of Ethiopia (CBE)</span>
                <span className="font-bold text-cyan-400">42% (622 cases)</span>
              </div>
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                <div className="bg-cyan-500 h-full w-[42%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between py-1 text-slate-300">
                <span>Telebirr Mobile Money</span>
                <span className="font-bold text-cyan-400">31% (459 cases)</span>
              </div>
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                <div className="bg-cyan-400 h-full w-[31%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between py-1 text-slate-300">
                <span>Bank of Abyssinia (BOA)</span>
                <span className="font-bold text-cyan-400">16% (237 cases)</span>
              </div>
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                <div className="bg-cyan-600 h-full w-[16%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between py-1 text-slate-300">
                <span>Dashen Bank</span>
                <span className="font-bold text-cyan-400">11% (164 cases)</span>
              </div>
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                <div className="bg-cyan-700 h-full w-[11%]" />
              </div>
            </div>
          </div>
        </div>

        <div className="cyber-card p-5 space-y-4">
          <h3 className="text-xs font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-400" />
            <span>REAL-TIME SYSTEM PERFORMANCE & LATENCY</span>
          </h3>
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-950 rounded border border-slate-800 flex justify-between items-center">
              <div>
                <p className="font-bold text-white">EthSwitch Gateway Settlement Engine</p>
                <p className="text-[10px] text-slate-500">Latency: 12ms // Uptime: 99.99%</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">OPTIMAL</span>
            </div>

            <div className="p-3 bg-slate-950 rounded border border-slate-800 flex justify-between items-center">
              <div>
                <p className="font-bold text-white">INSA Linkage Graph AI Pipeline</p>
                <p className="text-[10px] text-slate-500">Processing rate: 1,200 tx/sec</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">OPTIMAL</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
