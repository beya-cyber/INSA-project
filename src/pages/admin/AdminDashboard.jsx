import React from 'react'
import CommandHeader from '../../components/CommandHeader'
import { Users, Server, ShieldCheck, UserPlus } from 'lucide-react'

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col font-sans">
      <CommandHeader portalTitle="NDSIR SYSTEM GOVERNANCE & ACCESS MANAGEMENT" badgeId="ADMIN-ROOT-01" />

      <main className="p-6 max-w-[1700px] mx-auto w-full space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#0b1329] border border-cyan-900/40 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-slate-400 font-bold uppercase">PROVISIONED OPERATORS</p>
              <h3 className="text-2xl font-black text-cyan-400 mt-1">142 ACTIVE</h3>
            </div>
            <Users className="h-8 w-8 text-cyan-400" />
          </div>

          <div className="bg-[#0b1329] border border-emerald-900/40 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-slate-400 font-bold uppercase">ETHIO-NET CORE NODES</p>
              <h3 className="text-2xl font-black text-emerald-400 mt-1">12/12 ONLINE</h3>
            </div>
            <Server className="h-8 w-8 text-emerald-400" />
          </div>

          <div className="bg-[#0b1329] border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-slate-400 font-bold uppercase">SECURITY DEFCON</p>
              <h3 className="text-2xl font-black text-white mt-1">DEFCON 4</h3>
            </div>
            <ShieldCheck className="h-8 w-8 text-cyan-400" />
          </div>
        </div>

        <div className="bg-[#0b1329] border border-slate-800 rounded-3xl p-6 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-cyan-400" />
              Role-Based Access Control (RBAC) System
            </h2>
            <button className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 font-bold text-xs rounded-xl flex items-center gap-2 text-white">
              <UserPlus className="h-4 w-4" /> Provision New Badge
            </button>
          </div>
          <p className="text-slate-400 text-xs font-mono">Central LDAP & Django API Auth Nodes Synced.</p>
        </div>
      </main>
    </div>
  )
}
