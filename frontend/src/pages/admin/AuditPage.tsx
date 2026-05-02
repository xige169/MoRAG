import * as React from 'react'
import { ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown, Minus, FileText, Loader2 } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { MarkdownMessage } from '@/components/markdown/MarkdownMessage'
import { listAuditLogs } from '@/services/admin'
import type { AuditLogItem } from '@/types'
import { formatDate, truncate } from '@/lib/utils'

export function AuditPage() {
  const [items, setItems] = React.useState<AuditLogItem[]>([])
  const [total, setTotal] = React.useState(0)
  const [page, setPage] = React.useState(1)
  const [ratingFilter, setRatingFilter] = React.useState('all')
  const [loading, setLoading] = React.useState(true)
  const [detail, setDetail] = React.useState<AuditLogItem | null>(null)
  const PAGE_SIZE = 20

  const load = React.useCallback(() => {
    setLoading(true)
    listAuditLogs({ page, page_size: PAGE_SIZE, rating: ratingFilter === 'all' ? undefined : ratingFilter })
      .then((data) => { setItems(data.items); setTotal(data.total) })
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [page, ratingFilter])

  React.useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const ratingIcon = (r?: string) => {
    if (r === 'up') return <ThumbsUp className="h-3.5 w-3.5 text-success" />
    if (r === 'down') return <ThumbsDown className="h-3.5 w-3.5 text-destructive-foreground" />
    return <Minus className="h-3.5 w-3.5 text-muted-foreground" />
  }

  return (
    <AppLayout>
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h1 className="text-lg font-display font-semibold">审计日志</h1>
            <p className="text-xs text-muted-foreground mt-0.5">所有问答记录与用户反馈</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={ratingFilter} onValueChange={(v) => { setRatingFilter(v); setPage(1) }}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="up">点赞</SelectItem>
                <SelectItem value="down">点踩</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户</TableHead>
                  <TableHead className="w-64">问题</TableHead>
                  <TableHead className="w-72">回答</TableHead>
                  <TableHead>检索</TableHead>
                  <TableHead>耗时</TableHead>
                  <TableHead>反馈</TableHead>
                  <TableHead>时间</TableHead>
                  <TableHead className="w-16">详情</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.message_id}>
                    <TableCell className="font-medium text-sm">{item.username}</TableCell>
                    <TableCell className="text-sm">{truncate(item.question, 50)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{truncate(item.answer, 80)}</TableCell>
                    <TableCell>
                      <Badge variant={item.retrieval_mode === 'precise' ? 'default' : 'secondary'} className="text-xs">
                        {item.retrieval_mode === 'precise' ? '精准' : '广泛'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.retrieval_ms != null ? `${item.retrieval_ms}ms` : '—'}
                    </TableCell>
                    <TableCell>{ratingIcon(item.feedback_rating)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(item.created_at)}</TableCell>
                    <TableCell>
                      <button type="button" onClick={() => setDetail(item)} className="rounded p-1 hover:bg-accent text-muted-foreground hover:text-foreground">
                        <FileText className="h-3.5 w-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-12">暂无记录</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-border px-6 py-3">
          <p className="text-xs text-muted-foreground">共 {total} 条</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs">{page} / {Math.max(1, totalPages)}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Detail dialog */}
      <Dialog open={Boolean(detail)} onOpenChange={(open) => { if (!open) setDetail(null) }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>问答详情</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 pr-2">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">问题</p>
                <p className="text-sm">{detail?.question}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">回答</p>
                <MarkdownMessage content={detail?.answer ?? ''} />
              </div>
              {detail?.feedback_comment && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">反馈评论</p>
                  <p className="text-sm">{detail.feedback_comment}</p>
                </div>
              )}
              {detail && detail.sources.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">引用来源</p>
                  <div className="space-y-2">
                    {detail.sources.map((src, i) => (
                      <div key={i} className="rounded-lg bg-secondary border border-border p-3">
                        <p className="text-xs font-medium text-primary mb-1">[{src.index}] {src.doc_name}{src.page_number ? ` · 第${src.page_number}页` : ''}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{src.snippet}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
