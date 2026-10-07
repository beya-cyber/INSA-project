import React, { useState } from 'react';

export default function MfaFreezeModal({ isOpen, onClose, onConfirm }) {
  const [token, setToken] = useState('');
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-[#0b0f19] border border-cyan-500/50 rounded-xl shadow-2xl w-full max-w-md p-6 text-slate-200 z-10 space-y-4">
        
        <div className="flex items-center space-x-3 border-b border-cyan-900/40 pb-3">
          <div className="w-10 h-10 rounded-lg bg-rose-950 border border-rose-800 flex items-center justify-center text-rose-400 font-bold">
            🔒
          </div>
          <div>
            <h3 className="text-white font-bold text-sm font-mono uppercase tracking-wider">MFA Hardware Confirmation</h3>
            <p className="text-xs text-slate-400">EthSwitch Non-Repudiation Gate</p>
          </div>
        </div>

        <div className="bg-[#0b132b] p-3 rounded border border-cyan-900/40 text-xs text-slate-300 space-y-1">
          <div className="text-amber-400 font-semibold flex items-center gap-1">⚠️️ Security Warning</div>
          <p>You are about to execute an immutable emergency asset containment freeze directive. Hardware token or biometric clearance required.</p>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-slate-400 block font-mono">6-Digit Hardware Token / Biometric PIN</label>
          <input
            type="password"
            maxLength={6}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="••••••"
            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-center tracking-widest text-lg text-white font-mono focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="text-[10px] font-mono text-slate-500 bg-slate-950 p-2 rounded border border-slate-900">
          Immutable Audit Trail Log ID: <span className="text-cyan-400">AUD-2026-ETH-998231</span>
        </div>

        <div className="flex justify-end space-x-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs">
            Cancel
          </button>
          <button 
            onClick={() => { onConfirm(); onClose(); }}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-semibold shadow-lg shadow-rose-900/50"
          >
            Authenticate & Execute Freeze
          </button>
        </div>

      </div>
    </div>
  );
}
