'use client'

const TAG_COLORS = [
  { bg: '#E8F5E9', color: '#2E7D32' },
  { bg: '#E3F2FD', color: '#1565C0' },
  { bg: '#F3E5F5', color: '#6A1B9A' },
  { bg: '#FFF3E0', color: '#E65100' },
  { bg: '#FCE4EC', color: '#AD1457' },
  { bg: '#E0F2F1', color: '#00695C' },
  { bg: '#FFF8E1', color: '#F57F17' },
  { bg: '#EDE7F6', color: '#4527A0' },
]

function getTagColor(tag: string) {
  let hash = 0
  for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) | 0
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

interface TagBadgeProps {
  tag: string
  onRemove?: () => void
}

export default function TagBadge({ tag, onRemove }: TagBadgeProps) {
  const { bg, color } = getTagColor(tag)
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        padding: '1px 6px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 500,
        background: bg,
        color,
      }}
    >
      {tag}
      {onRemove && (
        <button
          onClick={onRemove}
          style={{ opacity: 0.6, lineHeight: 1, fontSize: 13, display: 'flex', alignItems: 'center' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
        >
          ×
        </button>
      )}
    </span>
  )
}
