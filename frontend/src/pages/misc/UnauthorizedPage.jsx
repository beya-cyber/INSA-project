import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'

export default function UnauthorizedPage() {
  return (
    <div className="console-shell flex flex-col items-center justify-center text-center px-6">
      <ShieldAlert className="h-10 w-10 text-critical mb-4" />
      <h1 className="text-lg font-semibold text-fog-100">Access restricted</h1>
      <p className="text-sm text-fog-500 mt-1 max-w-sm">
        Your account role doesn't have permission to view this page. If you believe this is an error, contact your System Administrator.
      </p>
      <Link to="/" className="btn-primary mt-6">Return home</Link>
    </div>
  )
}
