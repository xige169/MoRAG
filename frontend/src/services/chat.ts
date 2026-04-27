import { api } from './api'
import { getStoredToken } from './api'
import type { ChatSession, ChatMessage } from '@/types'

interface CreateSessionPayload {
  knowledge_base_ids: string[]
  title?: string
  system_prompt?: string
  retrieval_mode?: 'precise' | 'broad'
  top_k?: number
  similarity_threshold?: number
}

export async function listSessions(): Promise<ChatSession[]> {
  const res = await api.get<ChatSession[]>('/chat/sessions')
  return res.data
}

export async function createSession(payload: CreateSessionPayload): Promise<ChatSession> {
  const res = await api.post<ChatSession>('/chat/sessions', payload)
  return res.data
}

export async function getSession(sessionId: string): Promise<ChatSession> {
  const res = await api.get<ChatSession>(`/chat/sessions/${sessionId}`)
  return res.data
}

export async function updateSession(
  sessionId: string,
  data: Partial<CreateSessionPayload & { title: string }>,
): Promise<ChatSession> {
  const res = await api.patch<ChatSession>(`/chat/sessions/${sessionId}`, data)
  return res.data
}

export async function deleteSession(sessionId: string): Promise<void> {
  await api.delete(`/chat/sessions/${sessionId}`)
}

export async function listMessages(sessionId: string): Promise<ChatMessage[]> {
  const res = await api.get<ChatMessage[]>(`/chat/sessions/${sessionId}/messages`)
  return res.data
}

export async function clearMessages(sessionId: string): Promise<void> {
  await api.delete(`/chat/sessions/${sessionId}/messages`)
}

export function streamMessage(
  sessionId: string,
  content: string,
  onEvent: (raw: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const token = getStoredToken()
  return fetch(`/api/v1/chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ content }),
    signal,
  }).then(async (res) => {
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || `HTTP ${res.status}`)
    }
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop() ?? ''
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          onEvent(line.slice(6))
        }
      }
    }
  })
}
