import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, RadioTower, ChevronDown } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { ROLE_LABELS } from '../../lib/constants'

export default function TopBar({ title, subtitle, actions }) {
  const [now, setNow] = useState(new Date())
  const [query, setQuery] = useState('')
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/console/triage?q=${encodeURIComponent(query.trim())}`)
    }
  }

  const initials = (user?.username || '?')
    .split(/[._]/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="sticky top-0 z-10 border-b border-console-border bg-console-bg/90 backdrop-blur">
      <div className="flex items-center justify-between px-8 py-4 gap-6">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-fg-primary heading truncate">{title}</h1>
          {subtitle && <p className="text-sm text-fg-muted mt-0.5 truncate">{subtitle}</p>}
        </div>

        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tracking code, account, phone…"
              className="console-input w-full pl-9 !py-2 text-sm"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-0.5
                             rounded border border-console-border bg-console-surface px-1.5 py-0.5 text-[10px] text-fg-faint font-mono">
              ⌘K
            </kbd>
          </div>
        </form>

        <div className="flex items-center gap-4 shrink-0">
          {actions}

          <div className="flex items-center gap-1.5 text-xs text-fg-faint font-mono">
            <RadioTower className="h-3.5 w-3.5 text-status-success" />
            <span className="hidden lg:inline">LIVE</span>
            <span className="text-fg-muted hidden sm:inline">
              {now.toLocaleTimeString('en-GB', { hour12: false })} EAT
            </span>
          </div>

          <button className="flex items-center gap-2 rounded-lg border border-console-border bg-console-surface
                               px-2 py-1.5 hover:bg-console-surface-hover transition-colors duration-150">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand/15 text-[10px]
                               font-semibold text-brand-light">
              {initials}
            </span>
            <span className="hidden sm:block text-left">
              <span className="block text-xs font-medium text-fg-primary leading-tight">{user?.username}</span>
              <span className="block text-[10px] text-fg-faint leading-tight">{ROLE_LABELS[user?.role]}</span>
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-fg-faint hidden sm:block" />
          </button>
        </div>
      </div>
    </div>
  )
}
