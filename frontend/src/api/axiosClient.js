import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

const axiosClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Paths that should NEVER receive an Authorization header
const PUBLIC_PATHS = [
  '/incidents/submit/',
  '/incidents/evidence/upload/',
  '/incidents/track/',
  '/incidents/otp/request/',
  '/incidents/otp/verify/',
  '/auth/login/',
  '/auth/register/citizen/',
  '/auth/token/refresh/',
]

// --- Request interceptor: attach access token ---
axiosClient.interceptors.request.use((config) => {
  const isPublic = PUBLIC_PATHS.some((p) => config.url && config.url.includes(p))
  if (!isPublic) {
    const token = localStorage.getItem('ndsir_access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// --- Response interceptor: auto-refresh on 401 (safe, loop-proof) ---
let isRefreshing = false
let refreshQueue = []

function processQueue(error, token = null) {
  refreshQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)))
  refreshQueue = []
}

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {}

    // Caller explicitly opted out of auth-redirect behavior
    if (originalRequest._skipAuthRedirect) {
      return Promise.reject(error)
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('ndsir_refresh_token')

      // No refresh token → just fail. Do NOT redirect.
      if (!refreshToken) {
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
      isRefreshing = true

      try {
        const { data } = await axios.post(
          `${BASE_URL}/auth/token/refresh/`,
          { refresh: refreshToken }
        )
        localStorage.setItem('ndsir_access_token', data.access)
        processQueue(null, data.access)
        originalRequest.headers.Authorization = `Bearer ${data.access}`
        return axiosClient(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        localStorage.removeItem('ndsir_access_token')
        localStorage.removeItem('ndsir_refresh_token')

        // Only redirect if NOT already on login
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login'
        }
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(error)
  }
)

export default axiosClient
