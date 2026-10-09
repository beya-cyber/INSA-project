// src/components/common/DevPinBanner.jsx
// DEV-ONLY hint of the staff PINs. `import.meta.env.DEV` is false in `vite build`, so the text below
// is stripped from production bundles. Hidden on the public citizen pages.
import React from 'react'
import { useLocation } from 'react-router-dom'
import { PINS } from '../../store/ndsirStore'

const PUBLIC_ROUTES = ['/', '/citizen-report', '/case-tracker']

export default function DevPinBanner() {
  const { pathname } = useLocation()
  if (!import.meta.env.DEV || PUBLIC_ROUTES.includes(pathname)) return null
  return (
    <div
      className="fixed bottom-3 right-3 z-[60] pointer-events-none select-none rounded-lg border border-slate-700/60 bg-slate-950/80 px-3 py-1.5 font-mono text-[10px] text-slate-400 shadow-lg backdrop-blur"
      aria-hidden="true"
    >
      🧪 Dev PINs — Analyst: {PINS.analyst} · Bank: {PINS.bank} · Police: {PINS.police}
    </div>
  )
}
