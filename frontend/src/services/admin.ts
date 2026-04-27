import { api } from './api'
import type { User, AuditLogItem, Stats } from '@/types'

export async function listUsers(): Promise<User[]> {
  const res = await api.get<User[]>('/admin/users')
  return res.data
}

export async function createUser(data: {
  username: string
  password: string
  email?: string
  role: 'admin' | 'user'
}): Promise<User> {
  const res = await api.post<User>('/admin/users', data)
  return res.data
}

export async function updateUser(
  userId: string,
  data: { role?: 'admin' | 'user'; is_active?: boolean; password?: string },
): Promise<User> {
  const res = await api.patch<User>(`/admin/users/${userId}`, data)
  return res.data
}

export async function deleteUser(userId: string): Promise<void> {
  await api.delete(`/admin/users/${userId}`)
}

interface AuditLogParams {
  page?: number
  page_size?: number
  session_id?: string
  user_id?: string
  rating?: string
  from?: string
  to?: string
}

interface AuditLogResponse {
  total: number
  page: number
  items: AuditLogItem[]
}

export async function listAuditLogs(params: AuditLogParams = {}): Promise<AuditLogResponse> {
  const res = await api.get<AuditLogResponse>('/admin/audit-logs', { params })
  return res.data
}

export async function getStats(): Promise<Stats> {
  const res = await api.get<Stats>('/admin/stats')
  return res.data
}
