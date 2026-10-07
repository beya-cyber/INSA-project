// components/CaseDrawer.jsx
import React from 'react'
import { X, ShieldCheck, FileText, Headphones, Image as ImageIcon, ArrowRight, Lock } from 'lucide-react'

export function CaseDrawer({ isOpen, onClose, incident, onOpenMfa }) {
    if (!isOpen || !incident) return null

    return (
        <div className="fixed inset-0 z-50 overflow-hidden font-mono text-xs">
            {/* Dark semi-transparent backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="absolute inset-y-0 right-0 max-w-2xl w-full flex pl-10">
                <div className="w-full bg-[#070d1d] border-l border-cyan-500/30 shadow-2xl flex flex-col transform transition-transform duration-300 ease-out">

                    {/* Drawer Header */}
                    <div className="px-6 py-4 border-b border-cyan-500/20 flex items-center justify-between bg-[#0b0f19]">
                        <div>
                            <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold">Incident Ref: {incident.id}</span>
                            <h2 className="text-sm font-bold text-white tracking-wider">Case Investigation & Asset Containment</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">

                        {/* Top Section: Victim Metadata & Legal Proclamation Badge */}
                        <div className="bg-[#0b0f19] border border-cyan-500/20 rounded-xl p-4 space-y-3 shadow-md">
                            <div className="flex items-center justify-between">
                                <span className="text-slate-400 uppercase tracking-wider font-semibold">Victim Metadata</span>
                                <span className="px-2.5 py-1 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center gap-1.5 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                                    <ShieldCheck className="h-3 w-3" /> Proclamation 958/2016 Verified
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-xs pt-1">
                                <div>
                                    <span className="text-[10px] text-slate-500 block uppercase">Full Name</span>
                                    <span className="font-bold text-slate-200">{incident.victimName}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-500 block uppercase">Fayda / Kebele ID</span>
                                    <span className="font-mono text-cyan-300 font-bold">{incident.faydaId}</span>
                                </div>
                            </div>
                        </div>

                        {/* Middle Section: Interbank Directional Flow Visualizer */}
                        <div className="bg-[#0b0f19] border border-cyan-500/20 rounded-xl p-4 space-y-3 shadow-md">
                            <span className="text-slate-400 uppercase tracking-wider font-semibold">Interbank Directional Flow</span>
                            <div className="flex items-center justify-between py-4 px-4 bg-[#131b2e]/60 rounded-lg border border-cyan-500/10">
                                <div className="text-center">
                                    <span className="text-[10px] text-slate-400 block">Sending Bank</span>
                                    <span className="text-xs font-bold text-white mt-1 block">{incident.sendingBank}</span>
                                </div>
                                <div className="flex flex-col items-center px-4">
                                    <span className="text-[10px] font-mono text-cyan-400 font-bold">ETB {incident.amount}</span>
                                    <div className="w-28 h-0.5 bg-gradient-to-r from-cyan-500 to-emerald-400 relative my-2">
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-emerald-400 rounded-full animate-ping"></div>
                                    </div>
                                    <span className="text-[9px] text-slate-400">EthSwitch Node</span>
                                </div>
                                <div className="text-center">
                                    <span className="text-[10px] text-slate-400 block">Receiving Wallet</span>
                                    <span className="text-xs font-bold text-emerald-400 mt-1 block">{incident.receivingWallet}</span>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Section: Evidence Vault Preview Pane */}
                        <div className="bg-[#0b0f19] border border-cyan-500/20 rounded-xl p-4 space-y-3 shadow-md">
                            <span className="text-slate-400 uppercase tracking-wider font-semibold">Evidence Vault Preview</span>
                            <div className="space-y-2.5">
                                {/* Audio Call Log */}
                                <div className="p-3 bg-[#131b2e]/60 rounded-lg border border-cyan-500/10 flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <span className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg"><Headphones className="h-4 w-4" /></span>
                                        <div>
                                            <span className="font-bold text-slate-200 block">Fraudster_Audio_Intercept.wav</span>
                                            <span className="text-[10px] text-slate-500">Duration: 01:42 mins • Intercepted Call Log</span>
                                        </div>
                                    </div>
                                    <audio controls className="h-7 w-40 accent-cyan-500"></audio>
                                </div>

                                {/* Image Screenshot Preview */}
                                <div className="p-3 bg-[#131b2e]/60 rounded-lg border border-cyan-500/10 flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <span className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg"><ImageIcon className="h-4 w-4" /></span>
                                        <span className="font-bold text-slate-200">SMS_Phishing_Screenshot.png</span>
                                    </div>
                                    <span className="text-xs text-cyan-400 cursor-pointer hover:underline font-bold">Preview</span>
                                </div>

                                {/* PDF Bank Slip Preview */}
                                <div className="p-3 bg-[#131b2e]/60 rounded-lg border border-cyan-500/10 flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <span className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg"><FileText className="h-4 w-4" /></span>
                                        <span className="font-bold text-slate-200">Transaction_Receipt_Slip.pdf</span>
                                    </div>
                                    <span className="text-xs text-cyan-400 cursor-pointer hover:underline font-bold">View PDF</span>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Drawer Footer Action */}
                    <div className="px-6 py-4 border-t border-cyan-500/20 bg-[#0b0f19] flex justify-end">
                        <button
                            onClick={() => onOpenMfa(incident)}
                            className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <Lock className="h-4 w-4" />
                            Execute Freeze (MFA Required)
                        </button>
                    </div>

                </div>
            </div>
        </div>
    )
}