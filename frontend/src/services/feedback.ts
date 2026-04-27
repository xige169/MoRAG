import { api } from './api'
import type { Feedback } from '@/types'

export async function submitFeedback(
  messageId: string,
  data: { rating: 'up' | 'down'; comment?: string },
): Promise<Feedback> {
  const res = await api.post<Feedback>(`/feedback/messages/${messageId}`, data)
  return res.data
}

export async function updateFeedback(
  messageId: string,
  data: { rating: 'up' | 'down'; comment?: string },
): Promise<Feedback> {
  const res = await api.patch<Feedback>(`/feedback/messages/${messageId}`, data)
  return res.data
}

export async function getFeedback(messageId: string): Promise<Feedback> {
  const res = await api.get<Feedback>(`/feedback/messages/${messageId}`)
  return res.data
}
