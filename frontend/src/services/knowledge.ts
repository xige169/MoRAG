import { api } from './api'
import type { KnowledgeBase } from '@/types'

export async function listKnowledgeBases(): Promise<KnowledgeBase[]> {
  const res = await api.get<KnowledgeBase[]>('/knowledge-bases')
  return res.data
}

export async function createKnowledgeBase(data: { name: string; description?: string }): Promise<KnowledgeBase> {
  const res = await api.post<KnowledgeBase>('/knowledge-bases', data)
  return res.data
}

export async function getKnowledgeBase(kbId: string): Promise<KnowledgeBase> {
  const res = await api.get<KnowledgeBase>(`/knowledge-bases/${kbId}`)
  return res.data
}

export async function updateKnowledgeBase(kbId: string, data: { name?: string; description?: string }): Promise<KnowledgeBase> {
  const res = await api.put<KnowledgeBase>(`/knowledge-bases/${kbId}`, data)
  return res.data
}

export async function deleteKnowledgeBase(kbId: string): Promise<void> {
  await api.delete(`/knowledge-bases/${kbId}`)
}
