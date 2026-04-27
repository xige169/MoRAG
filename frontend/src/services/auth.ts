import { api } from './api'
import type { TokenResponse, User } from '@/types'

export async function login(username: string, password: string): Promise<TokenResponse> {
  const res = await api.post<TokenResponse>('/auth/login', { username, password })
  return res.data
}

export async function getMe(): Promise<User> {
  const res = await api.get<User>('/auth/me')
  return res.data
}

export async function refreshToken(refresh_token: string): Promise<TokenResponse> {
  const res = await api.post<TokenResponse>('/auth/refresh', { refresh_token })
  return res.data
}
