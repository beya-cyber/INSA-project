import React from 'react'
import { Building2, ShieldAlert, CheckCircle, Clock, ArrowUpRight } from 'lucide-react'
import { useIncidents } from '../../context/IncidentContext'

export default function BankHoldOrdersPage() {
  const { activeHolds } = useIncidents()

  return (
    <div className="p-6 space-y-6 font-mono bg-[#030712] text-slate-100 min-h-screen">
      <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
        <div>
          <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5" />
            <span>PARTNER PORTAL // ETHSWITCH & COMMERCIAL BANKS GATEWAY</span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1">EMERGENCY INTERBANK HOLD DIRECTIVES</h1>
        </div>

        <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-800/80 px-3 py-1.5 rounded text-xs text-emerald-400 font-bold">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          <span>ETHSWITCH API SYNCED</span>
        </div>
      </div>

      <div className="cyber-card p-5 space-y-4">
        <h2 className="text-xs font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-red-400" />
          <span>INSA DIRECTIVE DISPATCH REGISTER</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500">
                <th className="pb-3">DIRECTIVE ID</th>
                <th className="pb-3">CASE REF</th>
                <th className="pb-3">TARGET ACCOUNT</th>
                <th className="pb-3">TIMESTAMP</th>
                <th className="pb-3">STATUS</th>
                <th className="pb-3 text-right">GATEWAY ACK</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {activeHolds.length > 0 ? (
                activeHolds.map((hold) => (
                  <tr key={hold.holdId} className="hover:bg-slate-900/40">
                    <td className="py-3 font-bold text-cyan-400">{hold.holdId}</td>
                    <td className="py-3 text-white">{hold.caseId}</td>
                    <td className="py-3 text-slate-200">
                      {hold.target} <span className="text-slate-500">({hold.accountNumber})</span>
                    </td>
                    <td className="py-3 text-slate-400">{hold.timestamp}</td>
                    <td className="py-3 text-emerald-400 font-bold">LOCKED // ETHSWITCH</td>
                    <td className="py-3 text-right">
                      <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        CONFIRMED
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="hover:bg-slate-900/40">
                  <td className="py-3 font-bold text-cyan-400">HOLD-2026-9041-01</td>
                  <td className="py-3 text-white">ETH-2026-9041</td>
                  <td className="py-3 text-slate-200">
                    Telebirr Cashout Endpoint <span className="text-slate-500">(0911****55)</span>
                  </td>
                  <td className="py-3 text-slate-400">00:41:10 UTC</td>
                  <td className="py-3 text-emerald-400 font-bold">LOCKED // ETHSWITCH</td>
                  <td className="py-3 text-right">
                    <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      CONFIRMED
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
