import * as React from 'react'
import { Users, BookOpen, FileText, MessageSquare, MessageCircle, ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { getStats } from '@/services/admin'
import type { Stats } from '@/types'

interface StatCardProps {
  title: string
  value: number | string
  icon: React.ReactNode
  description?: string
}

function StatCard({ title, value, icon, description }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className="text-muted-foreground">{icon}</div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-display font-bold">{value}</p>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  )
}

export function StatsPage() {
  const [stats, setStats] = React.useState<Stats | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    getStats().then(setStats).catch(() => null).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <AppLayout>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    )
  }

  const satisfaction = stats && (stats.satisfied_count + stats.unsatisfied_count) > 0
    ? Math.round(stats.satisfied_count / (stats.satisfied_count + stats.unsatisfied_count) * 100)
    : null

  return (
    <AppLayout>
      <div className="flex h-full flex-col overflow-auto">
        <div className="border-b border-border px-6 py-4">
          <h1 className="text-lg font-display font-semibold">统计概览</h1>
          <p className="text-xs text-muted-foreground mt-0.5">系统使用情况汇总</p>
        </div>
        <div className="p-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <StatCard title="用户总数" value={stats?.total_users ?? 0} icon={<Users className="h-5 w-5" />} />
          <StatCard title="知识库数量" value={stats?.total_knowledge_bases ?? 0} icon={<BookOpen className="h-5 w-5" />} />
          <StatCard title="文档总数" value={stats?.total_documents ?? 0} icon={<FileText className="h-5 w-5" />} />
          <StatCard title="会话总数" value={stats?.total_sessions ?? 0} icon={<MessageSquare className="h-5 w-5" />} />
          <StatCard title="消息总数" value={stats?.total_messages ?? 0} icon={<MessageCircle className="h-5 w-5" />} />
          <StatCard title="点赞数" value={stats?.satisfied_count ?? 0} icon={<ThumbsUp className="h-5 w-5 text-success" />} />
          <StatCard title="点踩数" value={stats?.unsatisfied_count ?? 0} icon={<ThumbsDown className="h-5 w-5 text-destructive-foreground" />} />
          <StatCard
            title="满意度"
            value={satisfaction != null ? `${satisfaction}%` : '—'}
            icon={<ThumbsUp className="h-5 w-5 text-primary" />}
            description={stats ? `${stats.satisfied_count} 赞 / ${stats.unsatisfied_count} 踩` : undefined}
          />
        </div>
      </div>
    </AppLayout>
  )
}
