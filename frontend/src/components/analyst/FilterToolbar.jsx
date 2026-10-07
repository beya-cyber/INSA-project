import React from 'react';

export default function FilterToolbar({ selectedCount, onBulkFreeze, onBulkEscalate }) {
  return (
    <div className="space-y-3 mb-4">
      {/* Advanced Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-[#0b132b]/80 border border-cyan-900/40 p-3 rounded-lg">
        <span className="text-xs font-mono text-cyan-400 uppercase tracking-wide">Filters:</span>
        
        <select className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 font-mono">
          <option value="">Severity: All</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
        </select>

        <select className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 font-mono">
          <option value="">Institution: All</option>
          <option value="cbe">Commercial Bank of Ethiopia</option>
          <option value="telebirr">Telebirr</option>
          <option value="abyssinia">Bank of Abyssinia</option>
        </select>

        <select className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 font-mono">
          <option value="">Status: All Active</option>
          <option value="pending">Pending Review</option>
          <option value="dispatched">Dispatched</option>
        </select>
      </div>

      {/* Floating Bulk Action Bar (slides up when items selected) */}
      {selectedCount > 0 && (
        <div className="bg-[#0b0f19] border border-cyan-500/60 shadow-xl rounded-lg p-3 flex items-center justify-between animate-slide-up">
          <div className="flex items-center space-x-2 text-xs font-mono text-cyan-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>{selectedCount} incident(s) selected</span>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={onBulkFreeze}
              className="px-3 py-1.5 bg-rose-950 border border-rose-800 text-rose-200 hover:bg-rose-900 rounded text-xs font-semibold"
            >
              Execute Bulk Freeze
            </button>
            <button 
              onClick={onBulkEscalate}
              className="px-3 py-1.5 bg-cyan-950 border border-cyan-800 text-cyan-200 hover:bg-cyan-900 rounded text-xs font-semibold"
            >
              Bulk Escalate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
