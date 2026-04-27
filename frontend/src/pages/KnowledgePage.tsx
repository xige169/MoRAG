import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, BookOpen, FileText, Loader2, Pencil, Trash2 } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useKnowledgeStore } from '@/stores/knowledgeStore'
import type { KnowledgeBase } from '@/types'
import { formatDate } from '@/lib/utils'

export function KnowledgePage() {
  const navigate = useNavigate()
  const { kbs, isLoading, fetchKbs, createKb, updateKb, deleteKb } = useKnowledgeStore()
  const [showCreate, setShowCreate] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<KnowledgeBase | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<KnowledgeBase | null>(null)
  const [form, setForm] = React.useState({ name: '', description: '' })
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => { fetchKbs().catch(() => null) }, [fetchKbs])

  const openCreate = () => { setForm({ name: '', description: '' }); setShowCreate(true) }
  const openEdit = (kb: KnowledgeBase) => { setForm({ name: kb.name, description: kb.description ?? '' }); setEditTarget(kb) }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSubmitting(true)
    try {
      if (editTarget) {
        await updateKb(editTarget.id, form.name.trim(), form.description.trim() || undefined)
        setEditTarget(null)
      } else {
        await createKb(form.name.trim(), form.description.trim() || undefined)
        setShowCreate(false)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppLayout>
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h1 className="text-lg font-display font-semibold">知识库管理</h1>
            <p className="text-xs text-muted-foreground mt-0.5">创建并管理文档知识库</p>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            新建知识库
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : kbs.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center gap-3 text-center">
              <BookOpen className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">还没有知识库，点击「新建知识库」开始</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {kbs.map((kb) => (
                <Card
                  key={kb.id}
                  className="cursor-pointer hover:border-primary/50 transition-colors group"
                  onClick={() => navigate(`/knowledge/${kb.id}`)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
                          <BookOpen className="h-4 w-4 text-primary" />
                        </div>
                        <CardTitle className="text-sm">{kb.name}</CardTitle>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => openEdit(kb)} className="rounded p-1 hover:bg-accent text-muted-foreground hover:text-foreground">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => setDeleteTarget(kb)} className="rounded p-1 hover:bg-accent text-muted-foreground hover:text-destructive-foreground">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    {kb.description && <CardDescription className="text-xs mt-1">{kb.description}</CardDescription>}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <FileText className="h-3.5 w-3.5" />
                      <span>{kb.doc_count} 篇文档</span>
                      <span className="mx-1.5">·</span>
                      <span>{formatDate(kb.updated_at)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={showCreate || Boolean(editTarget)} onOpenChange={(open) => { if (!open) { setShowCreate(false); setEditTarget(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTarget ? '编辑知识库' : '新建知识库'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">名称 *</label>
              <Input placeholder="知识库名称" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">描述</label>
              <Textarea placeholder="知识库描述（选填）" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); setEditTarget(null) }}>取消</Button>
            <Button onClick={handleSave} disabled={!form.name.trim() || submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {editTarget ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              将删除知识库「{deleteTarget?.name}」及其所有文档和向量数据，无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteTarget) { deleteKb(deleteTarget.id).catch(() => null); setDeleteTarget(null) } }}>
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  )
}
