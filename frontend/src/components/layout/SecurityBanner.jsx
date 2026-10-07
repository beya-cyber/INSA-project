import React from 'react'
import { useAuth } from '../../context/AuthContext'

export default function SecurityBanner() {
    const { user } = useAuth()

    return (
        <div className="w-full bg-slate-900 border-b border-red-900/60 px-4 py-1.5 flex flex-wrap items-center justify-between text-xs font-mono gap-2 shadow-md">
            <div className="flex items-center gap-3">
                <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
                <span className="text-red-400 font-semibold tracking-wider uppercase">
                    RESTRICTED // INSA INTERNAL CYBEROPS CONSOLE
                </span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-400">OPERATOR: {user?.username || 'ANALYST'}</span>
            </div>
            <div className="flex items-center gap-4 text-slate-400">
                <span>DEFCON: <strong className="text-amber-400 font-bold">LEVEL 3</strong></span>
                <span class="text-slate-600">|</span>
                <span>ROLE: <strong className="text-cyan-400 uppercase">{user?.role || 'ANALYST'}</strong></span>
            </div>
        </div>
    )
}