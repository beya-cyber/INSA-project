import { Loader2 } from 'lucide-react'

export default function Spinner({ label = 'Loading', dark = false }) {
  return (
    <div className={`flex items-center justify-center gap-2 py-10 ${dark ? 'text-fg-muted' : 'text-fog-500'}`}>
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">{label}…</span>
    </div>
  )
}
