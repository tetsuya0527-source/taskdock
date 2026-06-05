'use client'

interface EditRepeatDialogProps {
  onClose: () => void
  onSaveSingle: () => void
  onSaveFuture: () => void
  onSaveAll: () => void
  type?: 'task' | 'event'
}

export default function EditRepeatDialog({ onClose, onSaveSingle, onSaveFuture, onSaveAll, type = 'task' }: EditRepeatDialogProps) {
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
          background: '#EFEEEB',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 12,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#37352F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </div>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#37352F', marginBottom: 6 }}>繰り返しの変更</h3>
        <p style={{ fontSize: 13, color: '#9B9A97', marginBottom: 16 }}>
          この{type === 'event' ? '予定' : 'タスク'}はシリーズの一部です。どの範囲を変更しますか？
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button
            onClick={onSaveSingle}
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
            この1件のみ変更
          </button>
          <button
            onClick={onSaveFuture}
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
            これ以降すべて変更
          </button>
          <button
            onClick={onSaveAll}
            style={{
              width: '100%', padding: '9px 14px', textAlign: 'left',
              borderRadius: 6, fontSize: 13, fontWeight: 600,
              background: '#37352F', color: '#FFFFFF',
              border: 'none',
              fontFamily: 'inherit', cursor: 'pointer',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#1A1A1A')}
            onMouseLeave={e => (e.currentTarget.style.background = '#37352F')}
          >
            シリーズ全体を変更
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
