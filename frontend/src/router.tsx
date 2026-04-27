import * as React from 'react'
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { LoginPage } from '@/pages/LoginPage'
import { ChatPage } from '@/pages/ChatPage'
import { KnowledgePage } from '@/pages/KnowledgePage'
import { KnowledgeDetailPage } from '@/pages/KnowledgeDetailPage'
import { UsersPage } from '@/pages/admin/UsersPage'
import { AuditPage } from '@/pages/admin/AuditPage'
import { StatsPage } from '@/pages/admin/StatsPage'

function RequireAuth() {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Outlet />
}

function RequireAdmin() {
  const { user } = useAuthStore()
  if (user?.role !== 'admin') return <Navigate to="/chat" replace />
  return <Outlet />
}

function AuthInit({ children }: { children: React.ReactNode }) {
  const { checkAuth } = useAuthStore()
  const [ready, setReady] = React.useState(false)
  React.useEffect(() => {
    checkAuth().finally(() => setReady(true))
  }, [checkAuth])
  if (!ready) return null
  return <>{children}</>
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <AuthInit>
        <Outlet />
      </AuthInit>
    ),
    children: [
      { index: true, element: <Navigate to="/chat" replace /> },
      { path: 'login', element: <LoginPage /> },
      {
        element: <RequireAuth />,
        children: [
          { path: 'chat', element: <ChatPage /> },
          { path: 'chat/:sessionId', element: <ChatPage /> },
          { path: 'knowledge', element: <KnowledgePage /> },
          { path: 'knowledge/:kbId', element: <KnowledgeDetailPage /> },
          {
            element: <RequireAdmin />,
            children: [
              { path: 'admin/users', element: <UsersPage /> },
              { path: 'admin/audit', element: <AuditPage /> },
              { path: 'admin/stats', element: <StatsPage /> },
            ],
          },
        ],
      },
      { path: '*', element: <Navigate to="/chat" replace /> },
    ],
  },
])
