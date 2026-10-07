import React from 'react';

export default function CaseDrawer({ isOpen, onClose, selectedCase }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#0b0f19] border-l border-cyan-900/50 shadow-2xl flex flex-col text-slate-200">
          
          {/* Header */}
          <div className="px-6 py-4 border-b border-cyan-900/40 flex items-center justify-between bg-[#0e1626]">
            <div>
              <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">[Case Investigation]</span>
              <h2 className="text-lg font-bold text-white font-mono">{selectedCase?.id || "INC-2026-9042"}</h2>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white text-sm p-1 rounded bg-slate-900 border border-slate-800">
              ✕
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Top Section: Victim Metadata & Proclamation */}
            <div className="bg-[#0b132b] border border-cyan-900/40 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs text-slate-400">Victim Metadata</span>
                  <h3 className="text-white font-semibold text-sm">{selectedCase?.victim || "Alemayehu Tadesse"}</h3>
                </div>
                <span className="bg-emerald-950 text-emerald-400 border border-emerald-800/60 text-[10px] font-mono px-2 py-0.5 rounded">
                  Proclamation 958/2016 Verified
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-2 border-t border-cyan-900/30">
                <div><span className="text-slate-500">Fayda/Kebele ID:</span> ETH-ID-884920</div>
                <div><span className="text-slate-500">Disputed Sum:</span> <span className="text-cyan-400 font-mono">ETB 145,000</span></div>
              </div>
            </div>

            {/* Middle Section: Interbank Directional Flow */}
            <div className="bg-[#0b132b] border border-cyan-900/40 rounded-lg p-4 space-y-3">
              <span className="text-xs text-slate-400 uppercase tracking-wider">Interbank Directional Flow</span>
              <div className="flex items-center justify-between text-xs font-mono pt-2">
                <div className="bg-slate-900 border border-slate-700 p-2 rounded text-center w-24">
                  <div className="text-cyan-400 font-bold">CBE</div>
                  <div className="text-[9px] text-slate-400">Sending Bank</div>
                </div>
                <div className="text-cyan-500 animate-pulse">➔➔➔</div>
                <div className="bg-slate-900 border border-slate-700 p-2 rounded text-center w-24">
                  <div className="text-emerald-400 font-bold">Telebirr</div>
                  <div className="text-[9px] text-slate-400">Receiver Wallet</div>
                </div>
              </div>
              <div className="text-[11px] text-slate-400 bg-slate-950 p-2 rounded border border-slate-900">
                EthSwitch Route Hash: <span className="font-mono text-cyan-300">0x4f89...c12e</span>
              </div>
            </div>

            {/* Bottom Section: Evidence Vault Preview Pane */}
            <div className="bg-[#0b132b] border border-cyan-900/40 rounded-lg p-4 space-y-3">
              <span className="text-xs text-slate-400 uppercase tracking-wider">Evidence Vault Preview</span>
              <div className="space-y-2 text-xs">
                <div className="bg-slate-900/80 p-2 rounded border border-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-2">🎵 Audio Call Log (Intercept)</span>
                  <button className="text-cyan-400 hover:underline">Play [0:42]</button>
                </div>
                <div className="bg-slate-900/80 p-2 rounded border border-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-2">🖼️ SMS Phishing Screenshot</span>
                  <span className="text-slate-400">PNG (1.2MB)</span>
                </div>
                <div className="bg-slate-900/80 p-2 rounded border border-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-2">📄 Bank Slip Confirmation</span>
                  <span className="text-slate-400">PDF (450KB)</span>
                </div>
              </div>
            </div>

          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-cyan-900/40 bg-[#0e1626] flex justify-end space-x-2">
            <button onClick={onClose} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-200">
              Close
            </button>
            <button className="px-4 py-2 bg-rose-950 border border-rose-800 text-rose-200 hover:bg-rose-900 rounded text-xs font-semibold">
              Execute Freeze
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
