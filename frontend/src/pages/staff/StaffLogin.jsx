import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { startSession } from '../../context/NdsirContext'
import { Shield, Lock, User, Key, ArrowLeft, AlertCircle, Terminal, ExternalLink } from 'lucide-react'

export default function StaffLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const [selectedRole, setSelectedRole] = useState(null)
  const [credentials, setCredentials] = useState({ username: '', password: '', token: '' })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const roles = [
    { id: 'analyst', name: 'Fraud Analyst Hub', path: '/analyst-dashboard', desc: 'National threat telemetry & case volume trends', icon: Shield, color: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/20' },
    { id: 'bank', name: 'Commercial Bank Portal', path: '/bank-dashboard', desc: 'Asset protection & emergency account freezes', icon: Lock, color: 'text-blue-400 border-blue-500/40 bg-blue-950/20' },
    { id: 'police', name: 'Law Enforcement / Police', path: '/police-dashboard', desc: 'Digital warrant execution & suspect tracking', icon: User, color: 'text-rose-400 border-rose-500/40 bg-rose-950/20' },
    { id: 'admin', name: 'System Administrator', path: '/admin-dashboard', desc: 'Gateway uptime, WAF logs & cluster nodes', icon: Terminal, color: 'text-indigo-400 border-indigo-500/40 bg-indigo-950/20' },
    { id: 'auditor', name: 'Compliance Auditor', path: '/auditor-dashboard', desc: 'Regulatory scorecards & immutable audit logs', icon: Key, color: 'text-amber-400 border-amber-500/40 bg-amber-950/20' },
  ]

  const handleLogin = (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    setTimeout(() => {
      if (!credentials.username || !credentials.password) {
        setError('Institutional credentials required for cryptographic session initiation.')
        setLoading(false)
        return
      }
      // Per-tab session (sessionStorage) so two tabs can sit in two different portals at once.
      startSession(selectedRole.id, credentials.username.trim())
      navigate(selectedRole.path)
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-[#010409] text-slate-100 font-mono flex flex-col items-center justify-center p-6 selection:bg-cyan-500 selection:text-black">
      {/* Top Banner linking to Citizen Reporting Portal */}
      <div className="absolute top-6 right-6">
        <button 
          onClick={() => navigate('/citizen-report')} 
          className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-cyan-500 rounded-xl text-xs text-cyan-400 font-bold flex items-center gap-2 transition-all shadow-lg cursor-pointer"
        >
          <span>Citizen / Victim Reporting Portal</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Header */}
      <div className="text-center space-y-2 mb-8 mt-6">
        <div className="inline-flex p-3 bg-cyan-950/80 border border-cyan-500/50 rounded-2xl text-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.3)] animate-pulse">
          <Shield className="h-8 w-8" />
        </div>
        <p className="text-[11px] text-cyan-400 tracking-widest uppercase font-bold">NDSIR NATIONAL COMMAND PLATFORM</p>
        <h1 className="text-2xl font-black text-white tracking-tight">Secure Institutional Authentication & RBAC Portal</h1>
        <p className="text-xs text-slate-400 max-w-md mx-auto">Select your authorized department and authenticate with your cryptographic institutional credentials</p>
      </div>

      {location.state?.notice && (
        <div className="mb-4 max-w-xl w-full p-3 bg-amber-950/70 border border-amber-500/40 rounded-xl text-xs text-amber-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" /> <span>{location.state.notice}</span>
        </div>
      )}

      {!selectedRole ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl w-full">
          {roles.map((role) => {
            const IconComponent = role.icon
            return (
              <div 
                key={role.id}
                onClick={() => setSelectedRole(role)}
                className="bg-[#070d1d]/80 border border-slate-800 hover:border-cyan-500/60 rounded-2xl p-5 cursor-pointer transition-all shadow-xl group flex items-start gap-4"
              >
                <div className={`p-3 rounded-xl border ${role.color} group-hover:scale-110 transition-transform`}>
                  <IconComponent className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">{role.name}</h3>
                  <p className="text-[11px] text-slate-400 mt-1">{role.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-[#070d1d] border border-cyan-500/40 rounded-2xl p-8 max-w-md w-full shadow-[0_0_30px_rgba(6,182,212,0.15)] relative space-y-6">
          <button 
            onClick={() => { setSelectedRole(null); setError(null); }}
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Role Selection
          </button>

          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white">Authenticating as: <span className="text-cyan-400">{selectedRole.name}</span></h2>
            <p className="text-[11px] text-slate-400">Enter your official employee ID and encrypted security token</p>
          </div>

          {error && (
            <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 uppercase font-bold">Institutional ID / Username</label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <input 
                  type="text" 
                  required
                  placeholder="e.g. INS-99201-ET"
                  value={credentials.username}
                  onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:border-cyan-500 outline-none transition-all font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 uppercase font-bold">Secure Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <input 
                  type="password" 
                  required
                  placeholder="••••••••••••"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:border-cyan-500 outline-none transition-all font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 uppercase font-bold">Hardware 2FA / OTP Token</label>
              <div className="relative">
                <Key className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="6-digit token (optional for test)"
                  value={credentials.token}
                  onChange={(e) => setCredentials({ ...credentials, token: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:border-cyan-500 outline-none transition-all font-mono"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.4)] disabled:opacity-50"
            >
              {loading ? 'Initiating Secure Handshake...' : 'Authenticate & Launch Dashboard'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
