import { create } from 'zustand'
import { toast } from 'sonner'
import type { KnowledgeBase, Document } from '@/types'
import {
  listKnowledgeBases,
  createKnowledgeBase,
  updateKnowledgeBase,
  deleteKnowledgeBase,
} from '@/services/knowledge'
import { listDocuments, patchDocument, deleteDocument, reprocessDocument } from '@/services/documents'

interface KnowledgeState {
  kbs: KnowledgeBase[]
  currentKb: KnowledgeBase | null
  documents: Document[]
  isLoading: boolean

  fetchKbs: () => Promise<void>
  createKb: (name: string, description?: string) => Promise<KnowledgeBase>
  updateKb: (kbId: string, name: string, description?: string) => Promise<void>
  deleteKb: (kbId: string) => Promise<void>
  selectKb: (kb: KnowledgeBase) => Promise<void>
  fetchDocuments: (kbId: string) => Promise<void>
  toggleDocument: (kbId: string, docId: string, enabled: boolean) => Promise<void>
  deleteDocument: (kbId: string, docId: string) => Promise<void>
  reprocessDocument: (kbId: string, docId: string) => Promise<void>
}

export const useKnowledgeStore = create<KnowledgeState>((set, get) => ({
  kbs: [],
  currentKb: null,
  documents: [],
  isLoading: false,

  fetchKbs: async () => {
    set({ isLoading: true })
    try {
      const kbs = await listKnowledgeBases()
      set({ kbs })
    } catch {
      // silent
    } finally {
      set({ isLoading: false })
    }
  },

  createKb: async (name, description) => {
    const kb = await createKnowledgeBase({ name, description })
    set((state) => ({ kbs: [kb, ...state.kbs] }))
    toast.success('知识库创建成功')
    return kb
  },

  updateKb: async (kbId, name, description) => {
    const updated = await updateKnowledgeBase(kbId, { name, description })
    set((state) => ({
      kbs: state.kbs.map((k) => (k.id === kbId ? updated : k)),
      currentKb: state.currentKb?.id === kbId ? updated : state.currentKb,
    }))
    toast.success('更新成功')
  },

  deleteKb: async (kbId) => {
    await deleteKnowledgeBase(kbId)
    set((state) => ({
      kbs: state.kbs.filter((k) => k.id !== kbId),
      currentKb: state.currentKb?.id === kbId ? null : state.currentKb,
    }))
    toast.success('删除成功')
  },

  selectKb: async (kb) => {
    set({ currentKb: kb })
    await get().fetchDocuments(kb.id)
  },

  fetchDocuments: async (kbId) => {
    set({ isLoading: true })
    try {
      const documents = await listDocuments(kbId)
      set({ documents })
    } catch {
      // silent
    } finally {
      set({ isLoading: false })
    }
  },

  toggleDocument: async (kbId, docId, enabled) => {
    const updated = await patchDocument(kbId, docId, { is_enabled: enabled })
    set((state) => ({
      documents: state.documents.map((d) => (d.id === docId ? updated : d)),
    }))
  },

  deleteDocument: async (kbId, docId) => {
    await deleteDocument(kbId, docId)
    set((state) => ({ documents: state.documents.filter((d) => d.id !== docId) }))
    toast.success('文档已删除')
  },

  reprocessDocument: async (kbId, docId) => {
    await reprocessDocument(kbId, docId)
    set((state) => ({
      documents: state.documents.map((d) =>
        d.id === docId ? { ...d, status: 'pending' as const } : d,
      ),
    }))
    toast.success('已重新提交处理')
  },
}))
