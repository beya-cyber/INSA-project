import { Loader2 } from 'lucide-react'

const VARIANTS = {
  primary: 'btn-primary',
  critical: 'btn-critical',
  ghostDark: 'btn-ghost-dark',
  ghostLight: 'btn-ghost-light',
}

export default function Button({ variant = 'primary', loading = false, children, className = '', ...props }) {
  return (
    <button className={`${VARIANTS[variant]} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
}
