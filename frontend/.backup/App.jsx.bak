// src/App.jsx
import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom'

// Public & citizen pages
import CitizenIntakeWizard from './pages/public/CitizenIntakeWizard'
import CaseTrackerPage from './pages/public/CaseTrackerPage'
import LoginPage from './pages/public/LoginPage'

// Staff & institutional pages (all five portals share one command-network store)
import StaffLogin from './pages/staff/StaffLogin'
import AnalystDashboard from './pages/analyst/AnalystDashboard'
import BankDashboard from './pages/bank/BankDashboard'
import PoliceDashboard from './pages/police/PoliceDashboard'
import AdminDashboard from './pages/admin/AdminDashboard'
import AuditorDashboard from './pages/auditor/AuditorDashboard'

import ConsoleNavbar from './components/common/ConsoleNavbar'
import RequireRole from './routes/RequireRole'
import { NdsirProvider } from './context/NdsirContext'

function StaffLayout() {
  return (
    <div className="min-h-screen bg-[#010409] text-slate-100">
      <ConsoleNavbar />
      <Outlet />
    </div>
  )
}

export default function App() {
  return (
    <NdsirProvider>
      <Router>
        <Routes>
          {/* Public & citizen routes */}
          <Route path="/" element={<CitizenIntakeWizard />} />
          <Route path="/citizen-report" element={<CitizenIntakeWizard />} />
          <Route path="/case-tracker" element={<CaseTrackerPage />} />
          <Route path="/public-login" element={<LoginPage />} />

          {/* Staff login */}
          <Route path="/login" element={<StaffLogin />} />
          <Route path="/staff/login" element={<StaffLogin />} />

          {/* Role dashboards: persistent navbar + per-role access gate */}
          <Route element={<StaffLayout />}>
            <Route element={<RequireRole role="analyst" />}><Route path="/analyst-dashboard" element={<AnalystDashboard />} /></Route>
            <Route element={<RequireRole role="bank" />}><Route path="/bank-dashboard" element={<BankDashboard />} /></Route>
            <Route element={<RequireRole role="police" />}><Route path="/police-dashboard" element={<PoliceDashboard />} /></Route>
            <Route element={<RequireRole role="admin" />}><Route path="/admin-dashboard" element={<AdminDashboard />} /></Route>
            <Route element={<RequireRole role="auditor" />}><Route path="/auditor-dashboard" element={<AuditorDashboard />} /></Route>
          </Route>

          {/* Legacy URLs from earlier templates */}
          <Route path="/partner-dashboard" element={<Navigate to="/auditor-dashboard" replace />} />
          <Route path="/bank-portal" element={<Navigate to="/bank-dashboard" replace />} />
          <Route path="/police-portal" element={<Navigate to="/police-dashboard" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </NdsirProvider>
  )
}
