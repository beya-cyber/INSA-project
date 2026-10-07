import { X } from 'lucide-react'

export default function Modal({ open, onClose, title, children, dark = true, footer }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={onClose}>
      <div
        className={`w-full max-w-lg rounded-xl border shadow-console-lg ${
          dark ? 'bg-console-surface border-console-border text-fg-primary' : 'bg-white border-mist-300 text-ink-950'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between px-5 py-4 border-b ${dark ? 'border-console-border' : 'border-mist-300'}`}>
          <h3 className="font-medium heading">{title}</h3>
          <button
            onClick={onClose}
            className={`rounded-md p-1 transition-colors ${dark ? 'text-fg-faint hover:text-fg-primary hover:bg-console-surface-hover' : 'text-fog-500 hover:text-ink-950 hover:bg-mist-200'}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <div className={`flex justify-end gap-2 px-5 py-4 border-t ${dark ? 'border-console-border' : 'border-mist-300'}`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
