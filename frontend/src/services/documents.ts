import { api } from './api'
import type { Document, ChunksResponse } from '@/types'

export async function uploadDocuments(kbId: string, files: File[]): Promise<Document[]> {
  const form = new FormData()
  files.forEach((f) => form.append('files', f))
  const res = await api.post<Document[]>(`/knowledge-bases/${kbId}/documents`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export async function listDocuments(kbId: string): Promise<Document[]> {
  const res = await api.get<Document[]>(`/knowledge-bases/${kbId}/documents`)
  return res.data
}

export async function getDocument(kbId: string, docId: string): Promise<Document> {
  const res = await api.get<Document>(`/knowledge-bases/${kbId}/documents/${docId}`)
  return res.data
}

export async function patchDocument(
  kbId: string,
  docId: string,
  data: { original_name?: string; is_enabled?: boolean },
): Promise<Document> {
  const res = await api.patch<Document>(`/knowledge-bases/${kbId}/documents/${docId}`, data)
  return res.data
}

export async function deleteDocument(kbId: string, docId: string): Promise<void> {
  await api.delete(`/knowledge-bases/${kbId}/documents/${docId}`)
}

export async function getChunks(kbId: string, docId: string): Promise<ChunksResponse> {
  const res = await api.get<ChunksResponse>(`/knowledge-bases/${kbId}/documents/${docId}/chunks`)
  return res.data
}

export async function reprocessDocument(kbId: string, docId: string): Promise<void> {
  await api.post(`/knowledge-bases/${kbId}/documents/${docId}/reprocess`)
}
