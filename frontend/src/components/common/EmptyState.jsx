export default function EmptyState({ icon: Icon, title, description, action, dark = false }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-16 px-6 rounded-xl border border-dashed
      ${dark ? 'border-console-border text-fg-muted' : 'border-mist-300 text-fog-500'}`}>
      {Icon && <Icon className="h-8 w-8 mb-3 opacity-60" />}
      <p className={`font-medium heading ${dark ? 'text-fg-primary' : 'text-ink-950'}`}>{title}</p>
      {description && <p className="text-sm mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
