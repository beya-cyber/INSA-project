// src/lib/session.js
// Single place that knows every client-side auth/session key, so login, logout and the
// axios 401 handler wipe exactly the same things.
export const TOKEN_KEY = 'ndsir_access_token'
export const REFRESH_KEY = 'ndsir_refresh_token'
export const DEMO_USER_KEY = 'ndsir_demo_user'
export const STATE_KEY = 'ndsir_state_v1' // shared command-network store (NdsirContext)

// per-tab staff session (sessionStorage) - NdsirContext reads these same keys
export const SESSION_KEYS = { role: 'ndsir_auth_role', user: 'ndsir_user', epoch: 'ndsir_session_epoch' }

export function clearAuthTokens() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(DEMO_USER_KEY)
}

/** Logout / failed-refresh: tokens + cached command-network state + this tab's staff session. */
export function clearAllClientState() {
  clearAuthTokens()
  localStorage.removeItem(STATE_KEY)
  Object.values(SESSION_KEYS).forEach((k) => sessionStorage.removeItem(k))
}
