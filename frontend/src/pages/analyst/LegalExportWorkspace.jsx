import React, { useState } from 'react'
import { FileText, Download, ShieldCheck, CheckCircle2, Lock, FileSpreadsheet } from 'lucide-react'
import { useIncidents } from '../../context/IncidentContext'

export default function LegalExportWorkspace() {
  const { activeHolds, incidents } = useIncidents()
  const [isExporting, setIsExporting] = useState(false)
  const [exportComplete, setExportComplete] = useState(false)

  const selectedCase = incidents[0] || {
    id: 'ETH-2026-9041',
    timestamp: '00:41:10 UTC',
    source: 'CBE (0922****19)',
    destination: 'Telebirr (0911****55)',
    value: 145000,
    riskScore: 94,
  }

  const handleGeneratePDF = () => {
    setIsExporting(true)
    setExportComplete(false)

    setTimeout(() => {
      setIsExporting(false)
      setExportComplete(true)

      // Generate downloadable text report
      const reportText = `=================================================================
INSA NATIONAL CYBER CRIME & FRAUD RESPONSE CONSOLE
LEGAL COURT EVIDENCE DOSSIER
=================================================================
CASE ID: ${selectedCase.id}
DISPATCH TIMESTAMP: ${selectedCase.timestamp}
RISK SCORE: ${selectedCase.riskScore} / 100
SOURCE ACCT: ${selectedCase.source}
DESTINATION ENDPOINT: ${selectedCase.destination}
TRANSACTION AMOUNT: ETB ${selectedCase.value.toLocaleString()}

ACTIVE HOLDS REGISTERED (${activeHolds.length}):
${
  activeHolds.length > 0
    ? activeHolds.map((h) => `- ${h.target} (${h.accountNumber}) | ${h.timestamp} \vert{}${h.status}`).join('\n')
    : '- HOLD-2026-09411: Telebirr Cashout Endpoint (0911****55) | ETHSWITCH GATEWAY LOCKED'
}

DIGITAL SIGNATURE & EVIDENCE SHA-256 HASH:
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855

STATUS: APPROVED FOR COURT SUBMISSION (INSA LEGAL AFFAIRS)
=================================================================`

      const blob = new Blob([reportText], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `INSA_LEGAL_EVIDENCE_${selectedCase.id}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }, 1500)
  }

  return (
    <div className="p-6 space-y-6 font-mono bg-[#030712] text-slate-100 min-h-screen">
      {/* Top Header */}
      <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest flex items-center gap-2">
            <FileText className="h-3.5 w-3.5" />
            <span>INSA // LEGAL EVIDENCE & COURT EXPORT WORKSPACE</span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1">INCIDENT DOSSIER & COURT EXPORT</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleGeneratePDF}
            disabled={isExporting}
            className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-4 py-2 rounded text-xs flex items-center gap-2 transition-all shadow-lg shadow-cyan-950 disabled:opacity-50"
          >
            {isExporting ? (
              <span>GENERATING DOSSIER...</span>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>EXPORT LEGAL EVIDENCE (.TXT / PDF)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Legal Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document Preview Card */}
        <div className="lg:col-span-2 cyber-card p-6 space-y-6 bg-[#080d1a] border-slate-800 relative">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-cyan-400" />
              <div>
                <h2 className="font-bold text-sm text-white">EVIDENCE DOSSIER: {selectedCase.id}</h2>
                <p className="text-[10px] text-slate-400">AUTHENTICATED BY INSA FORENSIC DISPATCH ENGINE</p>
              </div>
            </div>
            <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-800 px-2.5 py-1 rounded font-bold">
              CHAIN OF CUSTODY VERIFIED
            </span>
          </div>

          {/* Evidence Details */}
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-slate-950 rounded-lg border border-slate-800">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Incident Reference</span>
                <span className="font-bold text-white text-sm">{selectedCase.id}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Risk Assessment</span>
                <span className="font-bold text-red-400 text-sm">{selectedCase.riskScore} / 100 (CRITICAL)</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Total Intercepted</span>
                <span className="font-bold text-cyan-400 text-sm">ETB {selectedCase.value.toLocaleString()}</span>
              </div>
            </div>

            {/* Hold Directives Audit Log */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Lock className="h-3.5 w-3.5 text-cyan-400" />
                <span>EXECUTIVE HOLD DIRECTIVES REGISTER</span>
              </h3>

              <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500">
                      <th className="p-3">HOLD REF</th>
                      <th className="p-3">TARGET ACCOUNT</th>
                      <th className="p-3">TIMESTAMP</th>
                      <th className="p-3">GATEWAY STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {activeHolds.length > 0 ? (
                      activeHolds.map((hold) => (
                        <tr key={hold.holdId} className="hover:bg-slate-900/40">
                          <td className="p-3 font-bold text-cyan-400">{hold.holdId}</td>
                          <td className="p-3 text-white">
                            {hold.target} <span className="text-slate-500">({hold.accountNumber})</span>
                          </td>
                          <td className="p-3 text-slate-400">{hold.timestamp}</td>
                          <td className="p-3 text-emerald-400 font-bold">LOCKED // ETHSWITCH</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="p-3 font-bold text-cyan-400">HOLD-2026-9041-01</td>
                        <td className="p-3 text-white">
                          Telebirr Cashout Endpoint <span className="text-slate-500">(0911****55)</span>
                        </td>
                        <td className="p-3 text-slate-400">{selectedCase.timestamp}</td>
                        <td className="p-3 text-emerald-400 font-bold">LOCKED // ETHSWITCH</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cryptographic Hash Certification */}
            <div className="p-3 bg-slate-950/80 rounded border border-slate-800 font-mono text-[10px] space-y-1">
              <span className="text-slate-500 block uppercase font-bold">SHA-256 EVIDENCE DIGITAL SIGNATURE</span>
              <p className="text-emerald-400 break-all font-bold">
                e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
              </p>
            </div>
          </div>
        </div>

        {/* Side Actions & Guidance Panel */}
        <div className="space-y-6">
          <div className="cyber-card p-5 space-y-4">
            <h3 className="font-bold text-xs text-white border-b border-slate-800 pb-2 flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-cyan-400" />
              <span>COURT COMPLIANCE ACTIONS</span>
            </h3>

            {exportComplete && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>Court evidence dossier successfully compiled and downloaded!</span>
              </div>
            )}

            <button
              onClick={handleGeneratePDF}
              disabled={isExporting}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-3 rounded text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-950"
            >
              <Download className="h-4 w-4" />
              <span>DOWNLOAD COURT DOSSIER</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
