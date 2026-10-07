import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, isAuthenticated } = useAuth()
  const location = useLocation()

  // Wait until the session check resolves before deciding to redirect
  if (loading) {
    return (
      <div className="console-shell flex items-center justify-center text-fg-muted min-h-screen">
        Authenticating session...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  // Support both layout routes (<Outlet />) and wrapper usage ({children})
  return children ? children : <Outlet />
}