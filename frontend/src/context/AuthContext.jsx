import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { jwtDecode } from 'jwt-decode'
import { authApi } from '../api/authApi'
import { ROLES } from '../lib/constants'

const AuthContext = createContext(null)

const TOKEN_KEY = 'ndsir_access_token'
const REFRESH_KEY = 'ndsir_refresh_token'
const DEMO_USER_KEY = 'ndsir_demo_user'

const DEMO_USERS = {
  'analyst.demo': { role: ROLES.INSA_ANALYST, username: 'analyst.demo', is_mfa_enabled: true, organization_code: 'INSA' },
  'supervisor.demo': { role: ROLES.INSA_SUPERVISOR, username: 'supervisor.demo', is_mfa_enabled: true, organization_code: 'INSA' },
  'auditor.demo': { role: ROLES.AUDITOR, username: 'auditor.demo', is_mfa_enabled: true, organization_code: 'INSA' },
  'admin.demo': { role: ROLES.ADMIN, username: 'admin.demo', is_mfa_enabled: true, organization_code: 'INSA' },
  'bank.demo': { role: ROLES.BANK_AGENT, username: 'bank.demo', is_mfa_enabled: false, organization_code: 'CBE' },
  'police.demo': { role: ROLES.POLICE_LIAISON, username: 'police.demo', is_mfa_enabled: false, organization_code: 'FEDPOL-CIB' },
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const demoUser = localStorage.getItem(DEMO_USER_KEY)
    if (demoUser) {
      try {
        setUser(JSON.parse(demoUser))
        setLoading(false)
        return
      } catch {
        localStorage.removeItem(DEMO_USER_KEY)
      }
    }

    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      try {
        const decoded = jwtDecode(token)
        setUser({
          role: decoded.role,
          username: decoded.username,
          is_mfa_enabled: decoded.is_mfa_enabled,
          organization_code: decoded.organization_code,
        })
      } catch {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(REFRESH_KEY)
      }
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (username, password) => {
    if (DEMO_USERS[username] && password === 'demo') {
      const demoUser = DEMO_USERS[username]
      localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser))
      setUser(demoUser)
      return demoUser
    }

    const { data } = await authApi.login(username, password)
    localStorage.setItem(TOKEN_KEY, data.access)
    localStorage.setItem(REFRESH_KEY, data.refresh)
    const nextUser = { role: data.role, username: data.username, is_mfa_enabled: data.is_mfa_enabled }
    setUser(nextUser)
    return nextUser
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem(DEMO_USER_KEY)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, logout, isAuthenticated: !!user }),
    [user, loading, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}