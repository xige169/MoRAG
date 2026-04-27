import { create } from 'zustand'
import { toast } from 'sonner'
import type { User } from '@/types'
import { login as loginRequest, getMe } from '@/services/auth'
import { setAuthToken, getStoredToken } from '@/services/api'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: Boolean(getStoredToken()),
  isLoading: false,

  login: async (username, password) => {
    set({ isLoading: true })
    try {
      const data = await loginRequest(username, password)
      setAuthToken(data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
      set({ user: data.user, isAuthenticated: true })
      toast.success('登录成功')
    } catch (err) {
      throw err
    } finally {
      set({ isLoading: false })
    }
  },

  logout: () => {
    setAuthToken(null)
    localStorage.removeItem('refresh_token')
    set({ user: null, isAuthenticated: false })
    window.location.href = '/login'
  },

  checkAuth: async () => {
    const token = getStoredToken()
    if (!token) {
      set({ isAuthenticated: false })
      return
    }
    try {
      const user = await getMe()
      set({ user, isAuthenticated: true })
    } catch {
      set({ isAuthenticated: false })
    }
  },
}))
