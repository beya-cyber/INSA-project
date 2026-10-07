import React from 'react'
import CommandHeader from '../../components/CommandHeader'
import { FileCheck, Key } from 'lucide-react'

export default function AuditorDashboard() {
  const auditLogs = [
    { hash: '0x88f2...a941', action: 'FREEZE_ORDER_ISSUED', operator: 'INSA-8840', target: 'Telebirr 0911****82', timestamp: '2026-09-29 09:12:04' },
    { hash: '0x33e1...b012', action: 'WARRANT_SIGNED', operator: 'FED-POLICE-04', target: 'CBE-10002938491', timestamp: '2026-09-29 09:04:19' },
  ]

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col font-sans">
      <CommandHeader portalTitle="COMPLIANCE & IMMUTABLE AUDIT TRAIL PORTAL" badgeId="AUDITOR-GOV-01" />

      <main className="p-6 max-w-[1700px] mx-auto w-full space-y-6">
        <div className="bg-[#0b1329] border border-slate-800 rounded-3xl p-6 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-emerald-400" />
              Immutable Cryptographic Log Audit Ledger
            </h2>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {auditLogs.map((log, idx) => (
              <div key={idx} className="p-4 bg-[#020617] border border-slate-800 rounded-2xl flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                  <Key className="h-4 w-4 text-cyan-400" />
                  <div>
                    <span className="text-cyan-400 font-bold block">{log.hash}</span>
                    <span className="text-[10px] text-slate-500">TS: {log.timestamp}</span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">ACTION</span>
                  <span className="text-white font-bold">{log.action}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">OPERATOR</span>
                  <span className="text-slate-300">{log.operator}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
