export interface User {
  id: string
  username: string
  email?: string
  role: 'admin' | 'user'
  is_active: boolean
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user: User
}

export interface KnowledgeBase {
  id: string
  name: string
  description?: string
  owner_id: string
  is_active: boolean
  doc_count: number
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  knowledge_base_id: string
  original_name: string
  file_type: string
  file_size: number
  status: 'pending' | 'processing' | 'ready' | 'failed'
  error_message?: string
  chunk_count: number
  is_enabled: boolean
  created_at: string
  updated_at: string
}

export interface Chunk {
  chunk_index: number
  page_number?: number
  content: string
  char_count: number
}

export interface ChunksResponse {
  doc_id: string
  doc_name: string
  chunk_count: number
  chunks: Chunk[]
}

export interface ChatSession {
  id: string
  title?: string
  knowledge_base_ids: string[]
  system_prompt?: string
  retrieval_mode: 'precise' | 'broad'
  top_k: number
  similarity_threshold: number
  created_at: string
  updated_at: string
}

export interface Source {
  index: number
  chunk_id: string
  doc_id: string
  doc_name: string
  page_number?: number
  snippet: string
}

export interface ChatMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  sources: Source[]
  created_at: string
}

export interface SSEEvent {
  type: 'content' | 'sources' | 'done' | 'no_context' | 'error'
  delta?: string
  sources?: Source[]
  message?: string
  message_id?: string
  code?: string
  usage?: { input_tokens: number; output_tokens: number }
}

export interface Feedback {
  id: string
  message_id: string
  user_id: string
  rating: 'up' | 'down'
  comment?: string
  created_at: string
}

export interface AuditLogItem {
  message_id: string
  session_id: string
  user_id: string
  username: string
  question: string
  answer: string
  sources: Source[]
  retrieval_mode: string
  retrieval_ms?: number
  feedback_rating?: string
  feedback_comment?: string
  created_at: string
}

export interface Stats {
  total_users: number
  total_knowledge_bases: number
  total_documents: number
  total_sessions: number
  total_messages: number
  satisfied_count: number
  unsatisfied_count: number
}
