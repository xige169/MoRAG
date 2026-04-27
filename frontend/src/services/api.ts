import axios from 'axios'
import { toast } from 'sonner'

export const api = axios.create({
  baseURL: '/api/v1',
  timeout: 60000,
})

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    localStorage.setItem('access_token', token)
  } else {
    delete api.defaults.headers.common['Authorization']
    localStorage.removeItem('access_token')
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem('access_token')
}

// Initialize token on module load
const stored = getStoredToken()
if (stored) setAuthToken(stored)

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      setAuthToken(null)
      localStorage.removeItem('refresh_token')
      window.location.href = '/login'
      return Promise.reject(err)
    }
    const msg = err.response?.data?.detail || err.message || '请求失败'
    toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg))
    return Promise.reject(err)
  }
)
