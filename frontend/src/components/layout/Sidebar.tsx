import * as React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  MessageSquare,
  BookOpen,
  Users,
  BarChart3,
  ClipboardList,
  LogOut,
  Plus,
  MoreHorizontal,
  Trash2,
  ChevronRight,
  Bot,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useChatStore } from '@/stores/chatStore'
import { useKnowledgeStore } from '@/stores/knowledgeStore'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import type { ChatSession } from '@/types'

interface NavItem {
  label: string
  icon: React.ReactNode
  path: string
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { label: '对话', icon: <MessageSquare className="h-4 w-4" />, path: '/chat' },
  { label: '知识库', icon: <BookOpen className="h-4 w-4" />, path: '/knowledge' },
  { label: '用户管理', icon: <Users className="h-4 w-4" />, path: '/admin/users', adminOnly: true },
  { label: '审计日志', icon: <ClipboardList className="h-4 w-4" />, path: '/admin/audit', adminOnly: true },
  { label: '统计概览', icon: <BarChart3 className="h-4 w-4" />, path: '/admin/stats', adminOnly: true },
]

export function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const { sessions, currentSession, fetchSessions, deleteSession, selectSession } = useChatStore()
  const { kbs } = useKnowledgeStore()
  const [deleteTarget, setDeleteTarget] = React.useState<ChatSession | null>(null)

  React.useEffect(() => {
    fetchSessions().catch(() => null)
  }, [fetchSessions])

  const isChat = location.pathname.startsWith('/chat')
  const isKnowledge = location.pathname.startsWith('/knowledge')

  const visibleNavItems = navItems.filter((item) => !item.adminOnly || user?.role === 'admin')

  return (
    <aside className="flex h-screen w-64 flex-shrink-0 flex-col border-r border-border bg-card">
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Bot className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-display text-base font-semibold">RAG 知识库</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 px-2 pt-3">
        {visibleNavItems.map((item) => {
          const active = location.pathname.startsWith(item.path)
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              {item.icon}
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Sessions list when in chat */}
      {isChat && (
        <div className="flex flex-1 min-h-0 flex-col mt-3 px-2">
          <div className="flex items-center justify-between px-2 mb-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">历史对话</span>
            <button
              type="button"
              className="rounded p-1 hover:bg-accent text-muted-foreground hover:text-foreground"
              onClick={() => navigate('/chat/new')}
              title="新建对话"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-0.5">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={cn(
                  'group flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-colors',
                  currentSession?.id === session.id
                    ? 'bg-primary/15 text-primary'
                    : 'hover:bg-accent text-muted-foreground hover:text-foreground',
                )}
                onClick={() => { selectSession(session).catch(() => null); navigate(`/chat/${session.id}`) }}
              >
                <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="flex-1 truncate text-xs">{session.title || '新对话'}</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="opacity-0 group-hover:opacity-100 rounded p-0.5 hover:bg-border"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive-foreground"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(session) }}
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      删除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
            {sessions.length === 0 && (
              <p className="text-xs text-muted-foreground px-3 py-2">暂无对话记录</p>
            )}
          </div>
        </div>
      )}

      {/* KB list when in knowledge */}
      {isKnowledge && (
        <div className="flex flex-1 min-h-0 flex-col mt-3 px-2">
          <div className="flex items-center justify-between px-2 mb-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">知识库列表</span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-0.5">
            {kbs.map((kb) => (
              <div
                key={kb.id}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-colors',
                  location.pathname === `/knowledge/${kb.id}`
                    ? 'bg-primary/15 text-primary'
                    : 'hover:bg-accent text-muted-foreground hover:text-foreground',
                )}
                onClick={() => navigate(`/knowledge/${kb.id}`)}
              >
                <BookOpen className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="flex-1 truncate text-xs">{kb.name}</span>
                <ChevronRight className="h-3 w-3 opacity-40" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Spacer */}
      {!isChat && !isKnowledge && <div className="flex-1" />}

      {/* User footer */}
      <div className="border-t border-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-lg p-2 hover:bg-accent transition-colors"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                {(user?.username ?? 'U').slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium truncate">{user?.username}</p>
                <p className="text-xs text-muted-foreground">{user?.role === 'admin' ? '管理员' : '普通用户'}</p>
              </div>
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" sideOffset={8} className="w-48">
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive-foreground focus:text-destructive-foreground">
              <LogOut className="mr-2 h-4 w-4" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Delete session dialog */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              将永久删除对话「{deleteTarget?.title || '新对话'}」，无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteTarget) return
                const id = deleteTarget.id
                setDeleteTarget(null)
                deleteSession(id).catch(() => null)
                navigate('/chat')
              }}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  )
}
