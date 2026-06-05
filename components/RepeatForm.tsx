'use client'

import { RepeatConfig, RepeatType } from '@/types'

interface RepeatFormProps {
  value: RepeatConfig | null
  onChange: (value: RepeatConfig | null) => void
  mode?: 'task' | 'event'
}

type SelectRepeatType = RepeatType | 'biweekly'

const repeatTypes: { value: SelectRepeatType; label: string }[] = [
  { value: 'daily', label: '毎日' },
  { value: 'weekly', label: '毎週' },
  { value: 'biweekly', label: '隔週' },
  { value: 'monthly', label: '毎月' },
  { value: 'yearly', label: '毎年' },
]

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

const inputBase: React.CSSProperties = {
  border: '1px solid #E9E9E7',
  background: '#FAFAF8',
  color: '#37352F',
  borderRadius: 6,
  padding: '6px 10px',
  fontSize: 13,
  fontFamily: 'inherit',
}

export default function RepeatForm({ value, onChange, mode = 'task' }: RepeatFormProps) {
  const enabled = value !== null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Toggle */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none', width: 'fit-content' }}>
        <div
          onClick={() => onChange(enabled ? null : { type: 'weekly', interval: 1 })}
          style={{
            position: 'relative',
            flexShrink: 0,
            width: 34,
            height: 18,
            borderRadius: 9,
            background: enabled ? '#37352F' : '#D3D3CF',
            transition: 'background 0.15s',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 2,
              left: 2,
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: '#FFFFFF',
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              transform: enabled ? 'translateX(16px)' : 'translateX(0)',
              transition: 'transform 0.15s',
            }}
          />
        </div>
        <span style={{ fontSize: 13, color: '#37352F' }}>繰り返し</span>
      </label>

      {enabled && value && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 0 }}>
          {/* Type + Interval row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <select
              value={value.type === 'weekly' && value.interval === 2 ? 'biweekly' : value.type}
              onChange={e => {
                const v = e.target.value as SelectRepeatType
                if (v === 'biweekly') {
                  onChange({ ...value, type: 'weekly', interval: 2 })
                } else {
                  const newType = v as RepeatType
                  const updated: RepeatConfig = { ...value, type: newType, interval: value.interval === 2 && newType === 'weekly' ? 1 : (value.interval || 1) }
                  if (newType !== 'weekly') delete updated.weekday
                  onChange(updated)
                }
              }}
              style={inputBase}
            >
              {repeatTypes.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            {value.type !== 'weekly' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#9B9A97' }}>間隔</span>
                <input
                  type="number"
                  min={1} max={99}
                  value={value.interval}
                  onChange={e => onChange({ ...value, interval: Math.max(1, parseInt(e.target.value) || 1) })}
                  style={{ ...inputBase, width: 52, textAlign: 'center' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#9B9A97' }}>終了日</span>
              <input
                type="date"
                value={value.endDate || ''}
                onChange={e => onChange({ ...value, endDate: e.target.value || undefined })}
                style={inputBase}
              />
            </div>
          </div>

          {/* Weekday selector — weekly のみ表示 */}
          {value.type === 'weekly' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontSize: 11, color: '#9B9A97', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {mode === 'event' ? '繰り返す曜日' : '締切曜日'}
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                {WEEKDAYS.map((label, idx) => {
                  const active = value.weekday === idx
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onChange({
                        ...value,
                        weekday: active ? undefined : idx,
                      })}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        border: `1px solid ${active ? '#37352F' : '#E9E9E7'}`,
                        background: active ? '#37352F' : '#FAFAF8',
                        color: active ? '#FFFFFF' : idx === 0 ? '#E03E3E' : idx === 6 ? '#6E5ED2' : '#9B9A97',
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                        transition: 'all 0.1s',
                      }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
