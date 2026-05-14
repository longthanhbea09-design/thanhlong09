import { ORDER_STATUS_MAP } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: string
  className?: string
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = ORDER_STATUS_MAP[status] || {
    label: status,
    color: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border',
        config.color,
        className
      )}
    >
      {config.label}
    </span>
  )
}
