import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Settings2 } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { MessageList } from '@/components/chat/MessageList'
import { ChatInput } from '@/components/chat/ChatInput'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useChatStore } from '@/stores/chatStore'
import { useKnowledgeStore } from '@/stores/knowledgeStore'
import type { KnowledgeBase } from '@/types'

export function ChatPage() {
  const { sessionId } = useParams<{ sessionId?: string }>()
  const navigate = useNavigate()
  const { sessions, currentSession, selectSession, createSession, fetchSessions, clearCurrentSession } = useChatStore()
  const { kbs, fetchKbs } = useKnowledgeStore()
  const [showCreateDialog, setShowCreateDialog] = React.useState(false)
  const [selectedKbIds, setSelectedKbIds] = React.useState<string[]>([])
  const [retrievalMode, setRetrievalMode] = React.useState<'precise' | 'broad'>('precise')

  React.useEffect(() => {
    fetchSessions().catch(() => null)
    fetchKbs().catch(() => null)
  }, [fetchSessions, fetchKbs])

  React.useEffect(() => {
    if (sessionId === 'new') {
      setShowCreateDialog(true)
      return
    }
    if (sessionId) {
      const session = sessions.find((s) => s.id === sessionId)
      if (session) {
        selectSession(session).catch(() => null)
      }
    } else {
      clearCurrentSession()
    }
  }, [sessionId, sessions])

  const handleCreateSession = async () => {
    if (!selectedKbIds.length) return
    const session = await createSession(selectedKbIds, { retrieval_mode: retrievalMode })
    setShowCreateDialog(false)
    navigate(`/chat/${session.id}`, { replace: true })
  }

  return (
    <AppLayout>
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h1 className="font-semibold text-sm">
              {currentSession?.title || (sessionId ? '加载中…' : '知识库问答')}
            </h1>
            {currentSession && (
              <p className="text-xs text-muted-foreground">
                {retrievalMode === 'precise' ? '精准模式' : '广泛模式'}
              </p>
            )}
          </div>
          <Button size="sm" onClick={() => { setShowCreateDialog(true); navigate('/chat/new') }}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            新建对话
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 min-h-0">
          <MessageList />
        </div>

        {/* Input */}
        {currentSession && <ChatInput />}

        {/* No session placeholder */}
        {!currentSession && !sessionId && (
          <div className="flex-shrink-0 px-4 pb-6 pt-2 border-t border-border">
            <div className="mx-auto max-w-3xl text-center">
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-1" />
                新建对话
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create session dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => { setShowCreateDialog(open); if (!open && sessionId === 'new') navigate('/chat') }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建对话</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">选择知识库（可多选）</label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {kbs.filter((kb) => kb.is_active).map((kb: KnowledgeBase) => (
                  <label key={kb.id} className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-accent transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedKbIds.includes(kb.id)}
                      onChange={(e) => {
                        setSelectedKbIds((prev) =>
                          e.target.checked ? [...prev, kb.id] : prev.filter((id) => id !== kb.id),
                        )
                      }}
                      className="rounded"
                    />
                    <div>
                      <p className="text-sm font-medium">{kb.name}</p>
                      {kb.description && <p className="text-xs text-muted-foreground">{kb.description}</p>}
                      <p className="text-xs text-muted-foreground">{kb.doc_count} 篇文档</p>
                    </div>
                  </label>
                ))}
                {kbs.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">暂无知识库，请先创建</p>}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">检索模式</label>
              <Select value={retrievalMode} onValueChange={(v) => setRetrievalMode(v as 'precise' | 'broad')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="precise">精准模式 — 法规条款查询</SelectItem>
                  <SelectItem value="broad">广泛模式 — 探索性提问</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); if (sessionId === 'new') navigate('/chat') }}>取消</Button>
            <Button onClick={handleCreateSession} disabled={!selectedKbIds.length}>创建对话</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
