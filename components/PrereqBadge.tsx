import type { PrereqStatus } from '@/lib/types'

interface Props {
  status: PrereqStatus
  showLabel?: boolean
  size?: 'sm' | 'md'
}

const CONFIG = {
  ready: { label: 'Ready', dot: 'bg-green-400', text: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  partial: { label: 'Partial', dot: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  locked: { label: 'Locked', dot: 'bg-red-400', text: 'text-red-700', bg: 'bg-red-50 border-red-200' },
}

export default function PrereqBadge({ status, showLabel = true, size = 'md' }: Props) {
  const c = CONFIG[status]
  const pad = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${c.bg} ${c.text} ${pad}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {showLabel && c.label}
    </span>
  )
}
