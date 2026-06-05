'use client'

interface DeleteRepeatDialogProps {
  onClose: () => void
  onDeleteSingle: () => void
  onDeleteFuture: () => void
  type: 'task' | 'event'
}

export default function DeleteRepeatDialog({ onClose, onDeleteSingle, onDeleteFuture, type }: DeleteRepeatDialogProps) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}>
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(55,53,47,0.3)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 320,
          borderRadius: 10,
          padding: '20px',
          background: '#FFFFFF',
          boxShadow: '0 20px 60px rgba(55,53,47,0.16)',
        }}
      >
        <div style={{
          width: 36, height: 36,
          borderRadius: 8,
          background: '#FFEAEA',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 12,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E03E3E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6M14 11v6M9 6V4h6v2" />
          </svg>
        </div>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#37352F', marginBottom: 6 }}>繰り返しの削除</h3>
        <p style={{ fontSize: 13, color: '#9B9A97', marginBottom: 16 }}>
          この{type === 'task' ? 'タスク' : '予定'}はシリーズの一部です。
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button
            onClick={onDeleteSingle}
            style={{
              width: '100%', padding: '9px 14px', textAlign: 'left',
              borderRadius: 6, fontSize: 13, fontWeight: 500,
              background: '#EFEEEB', color: '#37352F',
              border: '1px solid #E9E9E7',
              fontFamily: 'inherit', cursor: 'pointer',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#E5E4E1')}
            onMouseLeave={e => (e.currentTarget.style.background = '#EFEEEB')}
          >
            この1件のみ削除
          </button>
          <button
            onClick={onDeleteFuture}
            style={{
              width: '100%', padding: '9px 14px', textAlign: 'left',
              borderRadius: 6, fontSize: 13, fontWeight: 600,
              background: '#FFEAEA', color: '#E03E3E',
              border: '1px solid #FECACA',
              fontFamily: 'inherit', cursor: 'pointer',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#FFD5D5')}
            onMouseLeave={e => (e.currentTarget.style.background = '#FFEAEA')}
          >
            以降すべて削除
          </button>
          <button
            onClick={onClose}
            style={{
              width: '100%', padding: '8px',
              fontSize: 13, color: '#9B9A97',
              background: 'transparent', border: 'none',
              fontFamily: 'inherit', cursor: 'pointer',
              transition: 'color 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#37352F')}
            onMouseLeave={e => (e.currentTarget.style.color = '#9B9A97')}
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  )
}
