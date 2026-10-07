import { NavLink } from 'react-router-dom'
import {
  ShieldCheck, LayoutGrid, Network, BarChart3, FileOutput,
  ClipboardList, Users, Landmark, Gavel, LogOut, PlusCircle,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { ROLES, ROLE_LABELS } from '../../lib/constants'

const NAV_BY_ROLE = {
  [ROLES.INSA_ANALYST]: [
    { to: '/console/triage', label: 'Triage Console', icon: LayoutGrid },
    { to: '/console/actions/new', label: 'New Action', icon: PlusCircle, accent: true },
    { to: '/console/linkage', label: 'Scam Linkage', icon: Network },
    { to: '/console/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/console/legal-export', label: 'Legal Export', icon: FileOutput },
  ],
  [ROLES.INSA_SUPERVISOR]: [
    { to: '/console/triage', label: 'Triage Console', icon: LayoutGrid },
    { to: '/console/actions/new', label: 'New Action', icon: PlusCircle, accent: true },
    { to: '/console/linkage', label: 'Scam Linkage', icon: Network },
    { to: '/console/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/console/legal-export', label: 'Legal Export', icon: FileOutput },
    { to: '/console/audit-logs', label: 'Audit Logs', icon: ClipboardList },
  ],
  [ROLES.AUDITOR]: [{ to: '/console/audit-logs', label: 'Audit Logs', icon: ClipboardList }],
  [ROLES.ADMIN]: [{ to: '/console/admin/users', label: 'User Management', icon: Users }],
  [ROLES.BANK_AGENT]: [{ to: '/partners/bank/holds', label: 'Hold Orders', icon: Landmark }],
  [ROLES.POLICE_LIAISON]: [{ to: '/partners/police/warrants', label: 'Warrant Packages', icon: Gavel }],
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const items = NAV_BY_ROLE[user?.role] || []

  return (
    <aside className="w-64 shrink-0 border-r border-console-border bg-console-surface flex flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-console-border">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/15 ring-1 ring-brand/25">
          <ShieldCheck className="h-4 w-4 text-brand-light" />
        </span>
        <span className="leading-tight">
          <span className="block text-sm font-semibold text-fg-primary heading">NDSIR Console</span>
          <span className="block text-[11px] text-fg-faint">INSA Operations</span>
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map(({ to, label, icon: Icon, accent }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `group flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 ease-smooth ${
                isActive
                  ? 'bg-brand/10 text-brand-light font-medium ring-1 ring-brand/20'
                  : accent
                  ? 'text-brand-light/90 hover:bg-brand/[0.08] hover:text-brand-light'
                  : 'text-fg-muted hover:bg-console-surface-hover hover:text-fg-primary'
              }`
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-console-border">
        <div className="px-3 mb-2">
          <p className="text-sm text-fg-primary font-medium truncate">{user?.username}</p>
          <p className="text-xs text-fg-faint truncate">{ROLE_LABELS[user?.role]}</p>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-fg-muted
                     hover:bg-status-danger/10 hover:text-status-danger transition-all duration-150 ease-smooth"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
