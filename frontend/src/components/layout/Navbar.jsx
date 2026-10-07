import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Shield, Activity, Share2, Scale, BarChart3, Building2, ShieldAlert } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function Navbar() {
  const location = useLocation()
  const { role, setRole } = useAuth()

  // Hide internal operator header on public citizen pages (/report, /track, /login, /)
  const isInternalRoute = location.pathname.startsWith('/console') || location.pathname.startsWith('/partners')

  if (!isInternalRoute) {
    return null
  }

  return (
    <header className="bg-[#080d1a] border-b border-slate-800 font-mono text-xs">
      {/* Top Banner */}
      <div className="bg-slate-950 px-4 py-1 flex items-center justify-between border-b border-slate-900 text-[10px] text-slate-400">
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 bg-red-950 text-red-400 border border-red-800 font-bold rounded">
            RESTRICTED // INSA ETHIO-CERT
          </span>
          <span>NATIONAL DIGITAL SCAM INTERCEPTION & RESPONSE SYSTEM</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-cyan-400">SESSION: Operator 042 (INSA Ethio-CERT)</span>
          <span className="text-emerald-400 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            ETHSWITCH GATEWAY: SECURE
          </span>
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/console/triage" className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-cyan-400" />
            <div>
              <span className="font-bold text-white text-sm block leading-none">NDSIR // CYBER-OPS</span>
              <span className="text-[9px] text-slate-400">INSA NATIONAL RESPONSE CONSOLE</span>
            </div>
          </Link>

          <nav className="flex items-center gap-1 bg-slate-900 p-1 rounded border border-slate-800">
            <Link
              to="/console/triage"
              className={`px-3 py-1.5 rounded flex items-center gap-1.5 font-bold transition-all ${
                location.pathname === '/console/triage' ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              <span>TRIAGE QUEUE</span>
            </Link>

            <Link
              to="/console/linkage"
              className={`px-3 py-1.5 rounded flex items-center gap-1.5 font-bold transition-all ${
                location.pathname === '/console/linkage' ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>GRAPH ANALYZER</span>
            </Link>

            <Link
              to="/console/legal"
              className={`px-3 py-1.5 rounded flex items-center gap-1.5 font-bold transition-all ${
                location.pathname === '/console/legal' ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Scale className="h-3.5 w-3.5" />
              <span>LEGAL EXPORT</span>
            </Link>

            <Link
              to="/console/analytics"
              className={`px-3 py-1.5 rounded flex items-center gap-1.5 font-bold transition-all ${
                location.pathname === '/console/analytics' ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>ANALYTICS</span>
            </Link>
          </nav>
        </div>

        {/* Role Access Selector */}
        <div className="flex items-center gap-3">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-cyan-400 rounded px-2.5 py-1 text-xs font-bold outline-none"
          >
            <option value="Lead Investigator (Holds)">Lead Investigator (Holds)</option>
            <option value="L2 Cyber Analyst">L2 Cyber Analyst</option>
            <option value="Legal & Forensics Officer">Legal & Forensics Officer</option>
          </select>
        </div>
      </div>
    </header>
  )
}
