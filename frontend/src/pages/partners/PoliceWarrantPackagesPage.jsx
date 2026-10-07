import React from 'react'
import { FileCode, Scale, ShieldCheck, Download, ExternalLink } from 'lucide-react'
import { useIncidents } from '../../context/IncidentContext'

export default function PoliceWarrantPackagesPage() {
  const { incidents } = useIncidents()

  return (
    <div className="p-6 space-y-6 font-mono bg-[#030712] text-slate-100 min-h-screen">
      <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
        <div>
          <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest flex items-center gap-2">
            <Scale className="h-3.5 w-3.5" />
            <span>PARTNER PORTAL // ETHIOPIAN FEDERAL POLICE & JUDICIAL ATTACHÉ</span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1">COURT WARRANT & FORENSIC EVIDENCE PACKAGES</h1>
        </div>

        <span className="bg-cyan-950 border border-cyan-800 text-cyan-400 text-xs px-3 py-1.5 rounded font-bold">
          EVIDENCE CHAIN-OF-CUSTODY ACTIVE
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {incidents.slice(0, 4).map((caseItem) => (
          <div key={caseItem.id} className="cyber-card p-5 space-y-4 bg-[#080d1a] border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] text-cyan-400 font-bold block uppercase">FORENSIC DOSSIER</span>
                <h3 className="font-bold text-sm text-white">{caseItem.id}</h3>
              </div>
              <span className="bg-red-950 text-red-400 border border-red-800 text-[10px] font-bold px-2 py-0.5 rounded">
                RISK {caseItem.riskScore}/100
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Suspect Endpoint:</span>
                <span className="font-bold text-white">{caseItem.destination}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Funds Intercepted:</span>
                <span className="font-bold text-cyan-400">ETB {caseItem.value.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">SHA-256 Hash:</span>
                <span className="font-mono text-[10px] text-emerald-400 truncate w-36">e3b0c44298fc1c149afb...</span>
              </div>
            </div>

            <button className="w-full bg-slate-900 hover:bg-cyan-500 hover:text-black border border-slate-700 hover:border-cyan-400 py-2 rounded text-xs font-bold transition-all flex items-center justify-center gap-2">
              <Download className="h-3.5 w-3.5" />
              <span>DOWNLOAD POLICE WARRANT PACKAGE</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
