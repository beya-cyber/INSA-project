import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import StaffLogin from '../pages/staff/StaffLogin'
import AnalystDashboard from '../pages/analyst/AnalystDashboard'
import PartnerDashboard from '../pages/partners/PartnerDashboard'
import AuditorDashboard from '../pages/auditor/AuditorDashboard'
import AdminDashboard from '../pages/admin/AdminDashboard'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/staff/login" replace />} />
      <Route path="/staff/login" element={<StaffLogin />} />
      <Route path="/login" element={<Navigate to="/staff/login" replace />} />
      
      <Route path="/analyst" element={<AnalystDashboard />} />
      <Route path="/partners" element={<PartnerDashboard />} />
      <Route path="/auditor" element={<AuditorDashboard />} />
      <Route path="/admin" element={<AdminDashboard />} />

      <Route path="*" element={<Navigate to="/staff/login" replace />} />
    </Routes>
  )
}
