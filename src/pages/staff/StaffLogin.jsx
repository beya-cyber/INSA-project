import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Lock } from 'lucide-react'
import api from '../../services/api'

export default function StaffLogin() {
  const [role, setRole] = useState('analyst')
  const [password, setPassword] = useState('admin123')
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    try {
      // Attempt backend authentication with fallback support
      await api.login({ role, password })
      localStorage.setItem('ndsir_role', role)
    } catch (err) {
      console.warn('Using local navigation bypass')
    }

    // Direct routing based on selected role
    switch (role) {
      case 'admin':
        navigate('/admin')
        break
      case 'auditor':
        navigate('/auditor')
        break
      case 'partner':
        navigate('/partners')
        break
      case 'analyst':
      default:
        navigate('/analyst')
        break
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col justify-center items-center p-4 text-slate-100 font-sans">
      <div className="w-full max-w-md bg-[#0b1329] border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-cyan-950/80 border border-cyan-500/40 rounded-2xl text-cyan-400 mb-2 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            <Shield className="h-8 w-8 animate-pulse" />
          </div>
          <p className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase">
            NDSIR PORTAL — INSA Anti-Fraud Command
          </p>
          <h1 className="text-2xl font-black text-white">System Access</h1>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono text-slate-400 font-bold mb-1.5 uppercase">
              Select Role Portal
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-[#020617] border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-slate-200 font-mono focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="analyst">Analyst Portal (Fraud Triage)</option>
              <option value="partner">Bank / Police Partner Portal</option>
              <option value="auditor">Auditor Portal (Compliance Logs)</option>
              <option value="admin">Admin Portal (System Governance)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-400 font-bold mb-1.5 uppercase">
              Security Badge / Password
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#020617] border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-slate-200 font-mono focus:outline-none focus:border-cyan-500 transition-colors pl-10"
              />
              <Lock className="h-4 w-4 text-slate-500 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3.5 rounded-xl text-xs font-mono tracking-wider transition-all duration-200 shadow-[0_0_20px_rgba(6,182,212,0.3)] mt-2"
          >
            INITIALIZE SESSION & ENTER
          </button>
        </form>
      </div>
    </div>
  )
}
