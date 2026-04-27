import { Badge } from '@/components/ui/badge'

const statusMap = {
  pending: { label: '待处理', variant: 'secondary' as const },
  processing: { label: '处理中', variant: 'warning' as const },
  ready: { label: '就绪', variant: 'success' as const },
  failed: { label: '失败', variant: 'destructive' as const },
}

interface StatusBadgeProps {
  status: keyof typeof statusMap
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, variant } = statusMap[status] ?? { label: status, variant: 'secondary' as const }
  return <Badge variant={variant}>{label}</Badge>
}
