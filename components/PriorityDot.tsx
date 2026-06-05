'use client'

import { Priority } from '@/types'

const colors: Record<Priority, string> = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#6366F1',
}

interface PriorityDotProps {
  priority: Priority
  size?: number
}

export default function PriorityDot({ priority, size = 8 }: PriorityDotProps) {
  return (
    <span
      className="inline-block rounded-full flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: colors[priority],
      }}
    />
  )
}
