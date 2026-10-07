import React from 'react'
import { Lock, Activity } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function INSAHeaderBanner() {
  const { currentUser } = useAuth()
  const operatorName = currentUser?.name || 'Operator 042 (INSA Ethio-CERT)'

  return (
    <div className="bg-[#02050e] border-b border-cyan-950 px-6 py-1 text-[10px] font-mono text-slate-400 flex flex-wrap items-center justify-between border-l-4 border-l-cyan-500">
      <div className="flex items-center gap-3">
        <span className="bg-cyan-950 text-cyan-400 font-bold px-2 py-0.5 rounded border border-cyan-800 text-[9px] tracking-widest uppercase">
          RESTRICTED // INSA ETHIO-CERT
        </span>
        <span className="text-slate-500 hidden sm:inline">
          NATIONAL DIGITAL SCAM INTERCEPTION & FRAUD RESPONSE SYSTEM (NDSIR)
        </span>
      </div>

      <div className="flex items-center gap-4 text-[10px]">
        <div className="flex items-center gap-1.5 text-slate-300">
          <Lock className="h-3 w-3 text-cyan-400" />
          <span>SESSION: <strong className="text-cyan-400">{operatorName}</strong></span>
        </div>

        <div className="flex items-center gap-1 text-emerald-400 font-bold">
          <Activity className="h-3 w-3 text-emerald-400 animate-pulse" />
          <span>ETHSWITCH GATEWAY: SECURE (0.04ms)</span>
        </div>
      </div>
    </div>
  )
}
