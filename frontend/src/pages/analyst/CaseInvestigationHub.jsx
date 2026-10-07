import React, { useState } from 'react';
import CaseDrawer from '../../components/analyst/CaseDrawer';
import MfaFreezeModal from '../../components/analyst/MfaFreezeModal';
import FilterToolbar from '../../components/analyst/FilterToolbar';

export default function CaseInvestigationHub() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMfaOpen, setIsMfaOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);

  const sampleIncident = {
    id: "INC-2026-9042",
    victim: "Alemayehu Tadesse",
    institution: "Commercial Bank of Ethiopia"
  };

  return (
    <div className="p-6 space-y-6 text-slate-200">
      <div className="flex justify-between items-center border-b border-cyan-900/40 pb-4">
        <div>
          <h1 className="text-lg font-bold font-mono text-white">Case Investigation & Evidence Vault</h1>
          <p className="text-xs text-slate-400">Isolated module for Proclamation 958/2016 verification and interbank tracing.</p>
        </div>
      </div>

      <FilterToolbar 
        selectedCount={selectedRows.length} 
        onBulkFreeze={() => setIsMfaOpen(true)}
        onBulkEscalate={() => alert("Bulk escalation dispatched.")}
      />

      <div className="bg-[#0b0f19] border border-cyan-900/40 rounded-xl overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#0e1626] border-b border-cyan-900/40 text-xs font-mono text-cyan-400">
              <th className="p-3 w-10">
                <input 
                  type="checkbox" 
                  onChange={(e) => setSelectedRows(e.target.checked ? [sampleIncident.id] : [])}
                />
              </th>
              <th className="p-3">Incident ID</th>
              <th className="p-3">Victim Metadata</th>
              <th className="p-3">Interbank Flow</th>
              <th className="p-3">Legal Badge</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cyan-950 text-xs">
            <tr className="hover:bg-cyan-950/20 cursor-pointer" onClick={() => { setSelectedCase(sampleIncident); setIsDrawerOpen(true); }}>
              <td className="p-3" onClick={(e) => e.stopPropagation()}>
                <input 
                  type="checkbox" 
                  checked={selectedRows.includes(sampleIncident.id)}
                  onChange={() => setSelectedRows(prev => prev.includes(sampleIncident.id) ? [] : [sampleIncident.id])}
                />
              </td>
              <td className="p-3 font-mono text-cyan-300">{sampleIncident.id}</td>
              <td className="p-3">Alemayehu Tadesse (ETH-ID-884920)</td>
              <td className="p-3 font-mono">CBE ➔ Telebirr</td>
              <td className="p-3"><span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] px-2 py-0.5 rounded font-mono">Proc. 958 Verified</span></td>
              <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                <button 
                  onClick={() => setIsMfaOpen(true)}
                  className="px-3 py-1 bg-rose-950 border border-rose-800 text-rose-200 hover:bg-rose-900 rounded font-semibold text-xs"
                >
                  Execute Freeze
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <CaseDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} selectedCase={selectedCase} />
      <MfaFreezeModal isOpen={isMfaOpen} onClose={() => setIsMfaOpen(false)} onConfirm={() => alert("Hardware MFA Freeze Executed!")} />
    </div>
  );
}
