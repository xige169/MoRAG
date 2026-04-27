import * as React from 'react'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog'
import { listUsers, createUser, updateUser, deleteUser } from '@/services/admin'
import type { User } from '@/types'
import { formatDate } from '@/lib/utils'

interface UserForm {
  username: string
  password: string
  email: string
  role: 'admin' | 'user'
}

export function UsersPage() {
  const [users, setUsers] = React.useState<User[]>([])
  const [loading, setLoading] = React.useState(true)
  const [showCreate, setShowCreate] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<User | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<User | null>(null)
  const [form, setForm] = React.useState<UserForm>({ username: '', password: '', email: '', role: 'user' })
  const [submitting, setSubmitting] = React.useState(false)

  const load = () => {
    setLoading(true)
    listUsers().then(setUsers).catch(() => null).finally(() => setLoading(false))
  }

  React.useEffect(() => { load() }, [])

  const openCreate = () => { setForm({ username: '', password: '', email: '', role: 'user' }); setShowCreate(true) }
  const openEdit = (user: User) => { setForm({ username: user.username, password: '', email: user.email ?? '', role: user.role }); setEditTarget(user) }

  const handleSave = async () => {
    setSubmitting(true)
    try {
      if (editTarget) {
        const patch: { role?: 'admin' | 'user'; password?: string } = { role: form.role }
        if (form.password.trim()) patch.password = form.password.trim()
        await updateUser(editTarget.id, patch)
        setEditTarget(null)
      } else {
        await createUser({ username: form.username.trim(), password: form.password.trim(), email: form.email.trim() || undefined, role: form.role })
        setShowCreate(false)
      }
      load()
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (user: User) => {
    await updateUser(user.id, { is_active: !user.is_active }).catch(() => null)
    load()
  }

  return (
    <AppLayout>
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h1 className="text-lg font-display font-semibold">用户管理</h1>
            <p className="text-xs text-muted-foreground mt-0.5">管理系统用户账号和权限</p>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            新建用户
          </Button>
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
                  <TableHead>用户名</TableHead>
                  <TableHead>邮箱</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="w-24">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role === 'admin' ? '管理员' : '用户'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch checked={user.is_active} onCheckedChange={() => handleToggleActive(user)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => openEdit(user)} className="rounded p-1 hover:bg-accent text-muted-foreground hover:text-foreground">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => setDeleteTarget(user)} className="rounded p-1 hover:bg-accent text-muted-foreground hover:text-destructive-foreground">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Create/Edit dialog */}
      <Dialog open={showCreate || Boolean(editTarget)} onOpenChange={(open) => { if (!open) { setShowCreate(false); setEditTarget(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTarget ? '编辑用户' : '新建用户'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {!editTarget && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">用户名 *</label>
                <Input placeholder="用户名" value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{editTarget ? '新密码（留空不修改）' : '密码 *'}</label>
              <Input type="password" placeholder={editTarget ? '留空则不修改' : '密码'} value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
            </div>
            {!editTarget && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">邮箱</label>
                <Input placeholder="邮箱（选填）" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">角色</label>
              <Select value={form.role} onValueChange={(v) => setForm((p) => ({ ...p, role: v as 'admin' | 'user' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">普通用户</SelectItem>
                  <SelectItem value="admin">管理员</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); setEditTarget(null) }}>取消</Button>
            <Button onClick={handleSave} disabled={(!editTarget && !form.username.trim()) || submitting}>
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
            <AlertDialogTitle>删除用户</AlertDialogTitle>
            <AlertDialogDescription>确认删除用户「{deleteTarget?.username}」？此操作无法恢复。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteTarget) { deleteUser(deleteTarget.id).then(load).catch(() => null); setDeleteTarget(null) } }}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  )
}
