import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Upload, RefreshCw, Trash2, Eye, ToggleLeft, ToggleRight, FileText, Loader2 } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/knowledge/StatusBadge'
import { DocumentUpload } from '@/components/knowledge/DocumentUpload'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useKnowledgeStore } from '@/stores/knowledgeStore'
import { getChunks } from '@/services/documents'
import { formatDate } from '@/lib/utils'
import type { Document, ChunksResponse } from '@/types'

export function KnowledgeDetailPage() {
  const { kbId } = useParams<{ kbId: string }>()
  const navigate = useNavigate()
  const { kbs, documents, isLoading, fetchKbs, selectKb, toggleDocument, deleteDocument, reprocessDocument } = useKnowledgeStore()
  const [showUpload, setShowUpload] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<Document | null>(null)
  const [chunksDoc, setChunksDoc] = React.useState<ChunksResponse | null>(null)
  const [chunksLoading, setChunksLoading] = React.useState(false)

  const kb = kbs.find((k) => k.id === kbId)

  React.useEffect(() => {
    fetchKbs().catch(() => null)
  }, [fetchKbs])

  React.useEffect(() => {
    if (kbId && kbs.length > 0) {
      const found = kbs.find((k) => k.id === kbId)
      if (found) selectKb(found).catch(() => null)
    }
  }, [kbId, kbs])

  // Poll processing documents
  React.useEffect(() => {
    const processingCount = documents.filter((d) => d.status === 'pending' || d.status === 'processing').length
    if (!processingCount || !kbId) return
    const timer = setInterval(() => {
      const { fetchDocuments } = useKnowledgeStore.getState()
      fetchDocuments(kbId).catch(() => null)
    }, 3000)
    return () => clearInterval(timer)
  }, [documents, kbId])

  const showChunks = async (doc: Document) => {
    if (!kbId) return
    setChunksLoading(true)
    try {
      const data = await getChunks(kbId, doc.id)
      setChunksDoc(data)
    } catch {
      // error shown by interceptor
    } finally {
      setChunksLoading(false)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  return (
    <AppLayout>
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate('/knowledge')} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-lg font-display font-semibold">{kb?.name ?? '知识库详情'}</h1>
              {kb?.description && <p className="text-xs text-muted-foreground mt-0.5">{kb.description}</p>}
            </div>
          </div>
          <Button size="sm" onClick={() => setShowUpload(true)}>
            <Upload className="h-3.5 w-3.5 mr-1" />
            上传文档
          </Button>
        </div>

        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>文件名</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>大小</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>切片数</TableHead>
                  <TableHead>上传时间</TableHead>
                  <TableHead className="w-32">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate max-w-[200px]" title={doc.original_name}>{doc.original_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="uppercase text-xs">{doc.file_type}</TableCell>
                    <TableCell>{formatSize(doc.file_size)}</TableCell>
                    <TableCell><StatusBadge status={doc.status} /></TableCell>
                    <TableCell>{doc.chunk_count}</TableCell>
                    <TableCell>{formatDate(doc.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {doc.status === 'ready' && (
                          <button type="button" title="查看切片" onClick={() => showChunks(doc)} className="rounded p-1 hover:bg-accent text-muted-foreground hover:text-foreground">
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {doc.status === 'failed' && (
                          <button type="button" title="重新处理" onClick={() => kbId && reprocessDocument(kbId, doc.id)} className="rounded p-1 hover:bg-accent text-muted-foreground hover:text-foreground">
                            <RefreshCw className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          title={doc.is_enabled ? '禁用' : '启用'}
                          onClick={() => kbId && toggleDocument(kbId, doc.id, !doc.is_enabled)}
                          className="rounded p-1 hover:bg-accent text-muted-foreground hover:text-foreground"
                        >
                          {doc.is_enabled ? <ToggleRight className="h-3.5 w-3.5 text-success" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                        </button>
                        <button type="button" title="删除" onClick={() => setDeleteTarget(doc)} className="rounded p-1 hover:bg-accent text-muted-foreground hover:text-destructive-foreground">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {documents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                      暂无文档，点击「上传文档」添加
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {kbId && <DocumentUpload kbId={kbId} open={showUpload} onOpenChange={setShowUpload} />}

      {/* Chunks preview */}
      <Dialog open={Boolean(chunksDoc)} onOpenChange={(open) => { if (!open) setChunksDoc(null) }}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{chunksDoc?.doc_name} — {chunksDoc?.chunk_count} 个切片</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <div className="space-y-3 pr-3">
              {chunksDoc?.chunks.map((chunk) => (
                <div key={chunk.chunk_index} className="rounded-lg border border-border bg-secondary p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-primary">#{chunk.chunk_index + 1}</span>
                    {chunk.page_number && <span className="text-xs text-muted-foreground">第 {chunk.page_number} 页</span>}
                    <span className="text-xs text-muted-foreground ml-auto">{chunk.char_count} 字</span>
                  </div>
                  <p className="text-xs leading-relaxed text-foreground/80 whitespace-pre-wrap">{chunk.content}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete document dialog */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除文档</AlertDialogTitle>
            <AlertDialogDescription>
              将删除「{deleteTarget?.original_name}」及其所有向量数据，无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (deleteTarget && kbId) {
                deleteDocument(kbId, deleteTarget.id).catch(() => null)
                setDeleteTarget(null)
              }
            }}>
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  )
}
