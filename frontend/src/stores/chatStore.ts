import { create } from 'zustand'
import { toast } from 'sonner'
import type { ChatSession, ChatMessage, Source, SSEEvent } from '@/types'
import {
  listSessions,
  createSession as createSessionRequest,
  deleteSession as deleteSessionRequest,
  updateSession,
  listMessages,
  streamMessage,
} from '@/services/chat'
import { submitFeedback } from '@/services/feedback'

interface ChatState {
  sessions: ChatSession[]
  currentSession: ChatSession | null
  messages: ChatMessage[]
  isLoading: boolean
  isStreaming: boolean
  streamingId: string | null
  streamAbort: AbortController | null

  fetchSessions: () => Promise<void>
  createSession: (kbIds: string[], opts?: { title?: string; system_prompt?: string; retrieval_mode?: 'precise' | 'broad'; top_k?: number; similarity_threshold?: number }) => Promise<ChatSession>
  selectSession: (session: ChatSession) => Promise<void>
  deleteSession: (sessionId: string) => Promise<void>
  renameSession: (sessionId: string, title: string) => Promise<void>
  sendMessage: (content: string) => Promise<void>
  cancelStream: () => void
  submitFeedback: (messageId: string, rating: 'up' | 'down') => Promise<void>
  clearCurrentSession: () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  currentSession: null,
  messages: [],
  isLoading: false,
  isStreaming: false,
  streamingId: null,
  streamAbort: null,

  fetchSessions: async () => {
    set({ isLoading: true })
    try {
      const sessions = await listSessions()
      set({ sessions })
    } catch {
      // silent
    } finally {
      set({ isLoading: false })
    }
  },

  createSession: async (kbIds, opts = {}) => {
    const session = await createSessionRequest({
      knowledge_base_ids: kbIds,
      retrieval_mode: opts.retrieval_mode ?? 'precise',
      top_k: opts.top_k ?? 5,
      similarity_threshold: opts.similarity_threshold ?? 0.72,
      ...opts,
    })
    set((state) => ({ sessions: [session, ...state.sessions], currentSession: session, messages: [] }))
    return session
  },

  selectSession: async (session) => {
    if (get().currentSession?.id === session.id && get().messages.length > 0) return
    set({ isLoading: true, currentSession: session, messages: [] })
    try {
      const messages = await listMessages(session.id)
      set({ messages })
    } catch {
      toast.error('加载消息失败')
    } finally {
      set({ isLoading: false })
    }
  },

  deleteSession: async (sessionId) => {
    await deleteSessionRequest(sessionId)
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== sessionId),
      currentSession: state.currentSession?.id === sessionId ? null : state.currentSession,
      messages: state.currentSession?.id === sessionId ? [] : state.messages,
    }))
    toast.success('删除成功')
  },

  renameSession: async (sessionId, title) => {
    await updateSession(sessionId, { title })
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === sessionId ? { ...s, title } : s)),
      currentSession: state.currentSession?.id === sessionId ? { ...state.currentSession, title } : state.currentSession,
    }))
  },

  sendMessage: async (content) => {
    const session = get().currentSession
    if (!session) return
    const userMsg: ChatMessage = {
      id: `tmp-user-${Date.now()}`,
      session_id: session.id,
      role: 'user',
      content,
      sources: [],
      created_at: new Date().toISOString(),
    }
    const asstId = `tmp-asst-${Date.now()}`
    const asstMsg: ChatMessage = {
      id: asstId,
      session_id: session.id,
      role: 'assistant',
      content: '',
      sources: [],
      created_at: new Date().toISOString(),
    }
    set((state) => ({
      messages: [...state.messages, userMsg, asstMsg],
      isStreaming: true,
      streamingId: asstId,
    }))

    const abort = new AbortController()
    set({ streamAbort: abort })

    try {
      await streamMessage(
        session.id,
        content,
        (raw) => {
          try {
            const evt = JSON.parse(raw) as SSEEvent
            if (evt.type === 'content' && evt.delta) {
              set((state) => ({
                messages: state.messages.map((m) =>
                  m.id === asstId ? { ...m, content: m.content + evt.delta } : m,
                ),
              }))
            } else if (evt.type === 'sources' && evt.sources) {
              const sources: Source[] = evt.sources
              set((state) => ({
                messages: state.messages.map((m) =>
                  m.id === asstId ? { ...m, sources } : m,
                ),
              }))
            } else if (evt.type === 'done') {
              if (evt.message_id) {
                set((state) => ({
                  messages: state.messages.map((m) =>
                    m.id === asstId ? { ...m, id: evt.message_id! } : m,
                  ),
                }))
              }
            } else if (evt.type === 'fallback') {
              set((state) => ({
                messages: state.messages.map((m) =>
                  m.id === asstId ? { ...m, is_fallback: true } : m,
                ),
              }))
            } else if (evt.type === 'error') {
              toast.error(evt.message || '生成失败')
            }
          } catch {
            // ignore parse errors
          }
        },
        abort.signal,
      )
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        toast.error('消息发送失败')
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === asstId ? { ...m, content: m.content || '（生成失败）' } : m,
          ),
        }))
      }
    } finally {
      set({ isStreaming: false, streamingId: null, streamAbort: null })
    }
  },

  cancelStream: () => {
    get().streamAbort?.abort()
    set({ isStreaming: false, streamingId: null, streamAbort: null })
  },

  submitFeedback: async (messageId, rating) => {
    await submitFeedback(messageId, { rating })
    toast.success(rating === 'up' ? '点赞成功' : '反馈已记录')
  },

  clearCurrentSession: () => {
    set({ currentSession: null, messages: [] })
  },
}))
