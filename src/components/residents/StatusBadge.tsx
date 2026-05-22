import { Badge } from '@/components/ui/badge'

export function StatusBadge({ status }: { status: 'active' | 'discharged' }) {
  return (
    <Badge variant={status === 'active' ? 'success' : 'secondary'}>
      {status === 'active' ? 'Active' : 'Discharged'}
    </Badge>
  )
}
