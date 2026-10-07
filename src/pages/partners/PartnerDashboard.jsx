import React from 'react'
import CommandHeader from '../../components/CommandHeader'
import { Landmark, FileText, Lock, ShieldCheck, Download } from 'lucide-react'

export default function PartnerDashboard() {
  const pendingWarrants = [
    { id: 'WRT-2026-091', targetAccount: 'CBE-10002938491', bank: 'Commercial Bank of Ethiopia', amount: '1,200,000 ETB', issueDate: '2026-09-29', status: 'PENDING FREEZE' },
    { id: 'WRT-2026-092', targetAccount: 'BOA-88392019', bank: 'Bank of Abyssinia', amount: '430,000 ETB', issueDate: '2026-09-29', status: 'FREEZE EXECUTED' },
  ]

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col font-sans">
      <CommandHeader portalTitle="PARTNER FINANCIAL SECURITY & LEGAL WARRANT PORTAL" badgeId="BANK-LIAISON-CBE" />

      <main className="p-6 max-w-[1700px] mx-auto w-full space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#0b1329] border border-cyan-900/40 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-slate-400 font-bold uppercase">ACTIVE BANK HOLDS</p>
              <h3 className="text-2xl font-black text-cyan-400 mt-1">28 ACCOUNTS</h3>
            </div>
            <Landmark className="h-8 w-8 text-cyan-400" />
          </div>

          <div className="bg-[#0b1329] border border-amber-900/40 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-slate-400 font-bold uppercase">PENDING WARRANTS</p>
              <h3 className="text-2xl font-black text-amber-400 mt-1">3 REVIEWS NEEDED</h3>
            </div>
            <FileText className="h-8 w-8 text-amber-400" />
          </div>

          <div className="bg-[#0b1329] border border-emerald-900/40 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-slate-400 font-bold uppercase">LEGAL FRAMEWORK</p>
              <h3 className="text-2xl font-black text-emerald-400 mt-1">PROCLAMATION NO. 761/2012</h3>
            </div>
            <ShieldCheck className="h-8 w-8 text-emerald-400" />
          </div>
        </div>

        <div className="bg-[#0b1329] border border-slate-800 rounded-3xl p-6 shadow-2xl">
          <h2 className="text-base font-bold text-white mb-4">Legal Warrant Execution Queue</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-3 px-4">WARRANT ID</th>
                  <th className="py-3 px-4">TARGET ACCOUNT</th>
                  <th className="py-3 px-4">INSTITUTION</th>
                  <th className="py-3 px-4">AMOUNT</th>
                  <th className="py-3 px-4">STATUS</th>
                  <th className="py-3 px-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {pendingWarrants.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-900/50">
                    <td className="py-4 px-4 font-bold text-cyan-400">{item.id}</td>
                    <td className="py-4 px-4">{item.targetAccount}</td>
                    <td className="py-4 px-4 text-slate-400">{item.bank}</td>
                    <td className="py-4 px-4 text-white font-bold">{item.amount}</td>
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        item.status === 'FREEZE EXECUTED' ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' : 'bg-amber-950/60 border-amber-800 text-amber-300'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-[11px] font-bold flex items-center gap-1">
                          <Download className="h-3.5 w-3.5" /> Warrant PDF
                        </button>
                        {item.status !== 'FREEZE EXECUTED' && (
                          <button className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white text-[11px] font-bold flex items-center gap-1">
                            <Lock className="h-3.5 w-3.5" /> Execute
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
