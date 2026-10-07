// src/components/common/ConsoleNavbar.jsx
// Persistent top bar for all staff portals: shows the signed-in portal, live cross-portal
// indicators (items waiting for the bank, audit-chain health, offline nodes) and sign-out.
import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Repeat } from 'lucide-react'
import { endSession, getSession, useNdsir } from '../../context/NdsirContext'
import { ROLE_LABELS, verifyChain } from '../../store/ndsirStore'

export default function ConsoleNavbar() {
  const navigate = useNavigate()
  const { state, actions } = useNdsir()
  const { role, user } = getSession()
  const pending = state.orders.filter((o) => o.status === 'PENDING_EXECUTION').length
  const isolated = state.nodes.filter((n) => n.status === 'ISOLATED').length
  const chainOk = useMemo(() => verifyChain(state.audit).ok, [state.audit])

  const chip = (tone, text) => <span className={`hidden lg:flex items-center gap-2 border px-3 py-1 rounded-full text-xs font-medium ${tone}`}>{text}</span>

  return (
    <header className="w-full bg-[#0b132b]/95 backdrop-blur-md border-b border-cyan-900/50 px-6 py-3 flex items-center justify-between shadow-lg sticky top-0 z-50">
      <div className="flex items-center space-x-4">
        <span className="bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 px-3.5 py-1.5 rounded-md text-xs font-semibold tracking-wide flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" /> {ROLE_LABELS[role] || 'NDSIR Command'}
        </span>
        <span className="hidden md:inline text-[11px] text-slate-400 font-mono">{user}</span>
      </div>
      <div className="flex items-center space-x-3">
        {chip(pending ? 'bg-amber-950/60 border-amber-800/50 text-amber-300' : 'bg-emerald-950/60 border-emerald-800/50 text-emerald-400', `${pending} freeze order${pending === 1 ? '' : 's'} awaiting bank`)}
        {chip(chainOk ? 'bg-emerald-950/60 border-emerald-800/50 text-emerald-400' : 'bg-rose-950/60 border-rose-800/50 text-rose-300', chainOk ? 'Audit chain verified' : 'AUDIT CHAIN BROKEN')}
        {isolated > 0 && chip('bg-rose-950/60 border-rose-800/50 text-rose-300', `${isolated} node${isolated === 1 ? '' : 's'} isolated`)}
        <button onClick={() => navigate('/staff/login')} className="text-slate-300 border border-slate-700 hover:border-cyan-500 text-xs font-medium px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer" title="Switch to another portal">
          <Repeat className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Switch Portal</span>
        </button>
        <button onClick={() => { endSession(); navigate('/staff/login', { replace: true }) }} className="bg-rose-950/80 text-rose-300 border border-rose-800/60 hover:bg-rose-900 hover:text-white text-xs font-medium px-3.5 py-1.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer">
          <LogOut className="h-3.5 w-3.5" /> <span>Sign Out</span>
        </button>
      </div>
    </header>
  )
}
