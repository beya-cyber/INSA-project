import axios from 'axios'
import { TOKEN_KEY, REFRESH_KEY, clearAuthTokens, clearAllClientState } from '../lib/session'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

// Endpoints that must work for anonymous citizens. We never attach a JWT to these: a stale or
// expired token in localStorage would otherwise make the backend answer 401 to a public request.
const PUBLIC_PATHS = [
  '/incidents/submit/',
  '/incidents/evidence/upload/',
  '/incidents/track/',
  '/incidents/otp/request/',
  '/incidents/otp/verify/',
  '/auth/login/',
  '/auth/register/citizen/',
]
const isPublic = (url = '') => PUBLIC_PATHS.some((p) => url.includes(p))

const axiosClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// --- Request interceptor: attach access token (not on public paths) ---
axiosClient.interceptors.request.use((config) => {
  if (isPublic(config.url)) {
    if (config.headers) delete config.headers.Authorization
    return config
  }
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// --- Response interceptor: auto-refresh on 401 ---
let isRefreshing = false
let refreshQueue = []

function processQueue(error, token = null) {
  refreshQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)))
  refreshQueue = []
}

// Refresh failed (or there is nothing to refresh with): wipe tokens AND cached state, go to login.
// Background requests (config.skipAuthRedirect, e.g. the dossier sync) only drop the tokens, so a
// poll running on the public citizen page can never bounce the visitor to /login.
function failSession(originalRequest) {
  if (originalRequest?.skipAuthRedirect) {
    clearAuthTokens()
    return
  }
  clearAllClientState()
  if (!['/login', '/staff/login'].includes(window.location.pathname)) {
    window.location.href = '/login'
  }
}

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (!originalRequest || error.response?.status !== 401 || originalRequest._retry || isPublic(originalRequest.url)) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({ resolve, reject })
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`
        return axiosClient(originalRequest)
      })
    }

    originalRequest._retry = true
    const refreshToken = localStorage.getItem(REFRESH_KEY)
    if (!refreshToken) {
      failSession(originalRequest)
      return Promise.reject(error)
    }

    isRefreshing = true
    try {
      const { data } = await axios.post(`${BASE_URL}/auth/token/refresh/`, { refresh: refreshToken })
      localStorage.setItem(TOKEN_KEY, data.access)
      if (data.refresh) localStorage.setItem(REFRESH_KEY, data.refresh) // backend rotates refresh tokens
      processQueue(null, data.access)
      originalRequest.headers.Authorization = `Bearer ${data.access}`
      return axiosClient(originalRequest)
    } catch (refreshError) {
      processQueue(refreshError, null)
      failSession(originalRequest)
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)

export default axiosClient
