// src/routes/RequireRole.jsx
// Lightweight RBAC gate for the five staff portals. Session = { role, user, epoch } in sessionStorage
// (written by StaffLogin). A Global Security Reset from the Admin bumps the shared epoch, which
// makes every other open session stale and sends it back to the login screen.
import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { getSession, useNdsir } from '../context/NdsirContext'

export const PORTAL_PATHS = {
  analyst: '/analyst-dashboard', bank: '/bank-dashboard', police: '/police-dashboard', admin: '/admin-dashboard', auditor: '/auditor-dashboard',
}

export default function RequireRole({ role }) {
  const { state } = useNdsir()
  const session = getSession()
  if (!session.role || !PORTAL_PATHS[session.role]) {
    return <Navigate to="/staff/login" replace state={{ notice: 'Authenticate to access the command platform.' }} />
  }
  if (session.epoch !== state.epoch) {
    return <Navigate to="/staff/login" replace state={{ notice: 'A Global Security Reset was issued by the Administrator. Please re-authenticate.' }} />
  }
  if (session.role !== role) return <Navigate to={PORTAL_PATHS[session.role]} replace />
  return <Outlet />
}
