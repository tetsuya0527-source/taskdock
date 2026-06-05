'use client'

import { useState } from 'react'
import { CalendarPeriod } from '@/types'

export const PERIOD_COLORS = [
  { bg: '#FEF3C7', text: '#92400E' },
  { bg: '#D1FAE5', text: '#065F46' },
  { bg: '#DBEAFE', text: '#1E40AF' },
  { bg: '#EDE9FE', text: '#5B21B6' },
  { bg: '#FCE7F3', text: '#9D174D' },
  { bg: '#F3F4F6', text: '#374151' },
]

interface PeriodModalProps {
  period?: CalendarPeriod | null
  defaultStartDate?: string
  onClose: () => void
  onSubmit: (data: Partial<CalendarPeriod>) => void
  onDelete?: (id: string) => void
}

const inputBase: React.CSSProperties = {
  border: '1px solid #E9E9E7',
  background: '#FAFAF8',
  color: '#37352F',
  borderRadius: 6,
  padding: '8px 10px',
  fontSize: 14,
  width: '100%',
  fontFamily: 'inherit',
}

const labelBase: React.CSSProperties = {
  fontSize: 11,
  color: '#9B9A97',
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  marginBottom: 6,
  display: 'block',
}

function getTodayStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export default function PeriodModal({ period, defaultStartDate, onClose, onSubmit, onDelete }: PeriodModalProps) {
  const [title, setTitle] = useState(period?.title || '')
  const [startDate, setStartDate] = useState(period?.startDate || defaultStartDate || '')
  const [endDate, setEndDate] = useState(period?.endDate || defaultStartDate || '')
  const [color, setColor] = useState(period?.color || PERIOD_COLORS[0].bg)
  const [isRepeat, setIsRepeat] = useState(!!period?.repeat)
  const [repeatStartDay, setRepeatStartDay] = useState(period?.repeat?.startDay ?? 1)
  const [repeatEndDay, setRepeatEndDay] = useState(period?.repeat?.endDay ?? 1)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    if (isRepeat) {
      const sd = Math.min(Math.max(repeatStartDay, 1), 31)
      const ed = Math.max(Math.min(repeatEndDay, 31), sd)
      // Store a representative startDate/endDate (current month) for reference
      const today = getTodayStr()
      const [y, m] = today.split('-').map(Number)
      const daysInMonth = new Date(y, m, 0).getDate()
      const refStart = `${today.slice(0, 7)}-${String(Math.min(sd, daysInMonth)).padStart(2, '0')}`
      const refEnd = `${today.slice(0, 7)}-${String(Math.min(ed, daysInMonth)).padStart(2, '0')}`
      onSubmit({
        title: title.trim(),
        startDate: refStart,
        endDate: refEnd,
        color,
        repeat: { type: 'monthly', startDay: sd, endDay: ed },
      })
    } else {
      if (!startDate || !endDate) return
      onSubmit({ title: title.trim(), startDate, endDate, color, repeat: undefined })
    }
  }

  const colorDef = PERIOD_COLORS.find(c => c.bg === color) ?? PERIOD_COLORS[0]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(55,53,47,0.3)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: 480,
        maxHeight: '92dvh',
        overflowY: 'auto',
        borderRadius: '12px 12px 0 0',
        background: '#FFFFFF',
        boxShadow: '0 -4px 40px rgba(55,53,47,0.12)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E9E9E7' }} />
        </div>

        <div style={{ padding: '8px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#37352F' }}>
            {period ? '期間を編集' : '期間を追加'}
          </h2>
          <button
            onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9B9A97', background: 'transparent', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#EFEEEB')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="期間名（例：夏休み、テスト期間）"
            required
            autoFocus
            style={{ ...inputBase, fontSize: 15, fontWeight: 500 }}
          />

          {/* Repeat toggle */}
          <button
            type="button"
            onClick={() => setIsRepeat(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 10px', borderRadius: 6,
              background: isRepeat ? '#EDE9FE' : '#FAFAF8',
              border: `1px solid ${isRepeat ? '#C4B5FD' : '#E9E9E7'}`,
              color: isRepeat ? '#5B21B6' : '#9B9A97',
              fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 014-4h14" />
              <path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 01-4 4H3" />
            </svg>
            毎月繰り返す
            <div style={{
              marginLeft: 'auto',
              width: 32, height: 18, borderRadius: 9,
              background: isRepeat ? '#5B21B6' : '#D1D5DB',
              position: 'relative', transition: 'background 0.15s',
            }}>
              <div style={{
                position: 'absolute', top: 2,
                left: isRepeat ? 16 : 2,
                width: 14, height: 14, borderRadius: '50%',
                background: '#FFFFFF', transition: 'left 0.15s',
              }} />
            </div>
          </button>

          {isRepeat ? (
            <div>
              <label style={labelBase}>毎月の日程</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
                  <input
                    type="number"
                    min={1} max={31}
                    value={repeatStartDay}
                    onChange={e => {
                      const v = Math.min(31, Math.max(1, Number(e.target.value)))
                      setRepeatStartDay(v)
                      if (repeatEndDay < v) setRepeatEndDay(v)
                    }}
                    style={{ ...inputBase, width: 64, textAlign: 'center' }}
                  />
                  <span style={{ fontSize: 13, color: '#9B9A97', whiteSpace: 'nowrap' }}>日</span>
                </div>
                <span style={{ fontSize: 13, color: '#9B9A97' }}>〜</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
                  <input
                    type="number"
                    min={repeatStartDay} max={31}
                    value={repeatEndDay}
                    onChange={e => setRepeatEndDay(Math.min(31, Math.max(repeatStartDay, Number(e.target.value))))}
                    style={{ ...inputBase, width: 64, textAlign: 'center' }}
                  />
                  <span style={{ fontSize: 13, color: '#9B9A97', whiteSpace: 'nowrap' }}>日</span>
                </div>
              </div>
              {repeatStartDay === repeatEndDay && (
                <p style={{ fontSize: 11, color: '#9B9A97', marginTop: 5 }}>毎月{repeatStartDay}日（1日のみ）</p>
              )}
              {repeatStartDay !== repeatEndDay && (
                <p style={{ fontSize: 11, color: '#9B9A97', marginTop: 5 }}>毎月{repeatStartDay}日〜{repeatEndDay}日</p>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelBase}>開始日</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required style={inputBase} />
              </div>
              <div>
                <label style={labelBase}>終了日</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required style={inputBase} />
              </div>
            </div>
          )}

          <div>
            <label style={labelBase}>カラー</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {PERIOD_COLORS.map(c => (
                <button
                  key={c.bg}
                  type="button"
                  onClick={() => setColor(c.bg)}
                  style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: c.bg,
                    border: color === c.bg ? `2px solid ${c.text}` : '2px solid transparent',
                    cursor: 'pointer', outline: 'none',
                    transition: 'transform 0.1s',
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.2)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                />
              ))}
              {title && (
                <div style={{
                  flex: 1, height: 26, borderRadius: 5,
                  background: color,
                  display: 'flex', alignItems: 'center', padding: '0 8px',
                  fontSize: 11, fontWeight: 600, color: colorDef.text,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  marginLeft: 4,
                }}>
                  {title}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
            <button
              type="submit"
              style={{
                flex: 1, padding: '9px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                background: '#37352F', color: '#FFFFFF', border: 'none', fontFamily: 'inherit', cursor: 'pointer',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#1A1A1A')}
              onMouseLeave={e => (e.currentTarget.style.background = '#37352F')}
            >
              {period ? '保存' : '追加'}
            </button>
            {period && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(period.id)}
                style={{
                  padding: '9px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                  background: '#FFEAEA', color: '#E03E3E', border: '1px solid #FECACA',
                  fontFamily: 'inherit', cursor: 'pointer', transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#FFD5D5')}
                onMouseLeave={e => (e.currentTarget.style.background = '#FFEAEA')}
              >
                削除
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 14px', borderRadius: 6, fontSize: 13,
                background: '#EFEEEB', color: '#9B9A97', border: '1px solid #E9E9E7',
                fontFamily: 'inherit', cursor: 'pointer', transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#E5E4E1')}
              onMouseLeave={e => (e.currentTarget.style.background = '#EFEEEB')}
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
