'use client'

import { useState, useEffect } from 'react'
import { Task, Priority, Weight, RepeatConfig } from '@/types'
import RepeatForm from './RepeatForm'
import TagInput from './TagInput'

interface TaskFormProps {
  initial?: Partial<Task>
  allTags: string[]
  onSubmit: (data: Partial<Task>) => void
  onCancel: () => void
  submitLabel?: string
}

const priorities: { value: Priority; label: string; color: string; bg: string }[] = [
  { value: 'high', label: '高', color: '#E03E3E', bg: '#FFEAEA' },
  { value: 'medium', label: '中', color: '#D9730D', bg: '#FFF3E0' },
  { value: 'low', label: '低', color: '#6E5ED2', bg: '#EEF0FF' },
]

const weights: { value: Weight; label: string; color: string; bg: string }[] = [
  { value: '大', label: '大', color: '#37352F', bg: '#EFEEEB' },
  { value: '中', label: '中', color: '#9B9A97', bg: '#F5F5F3' },
  { value: '小', label: '小', color: '#C4C4C0', bg: '#FAFAF8' },
]

const WEEKDAY_LABELS = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日']

const inputBase: React.CSSProperties = {
  border: '1px solid #E9E9E7',
  background: '#FAFAF8',
  color: '#37352F',
  borderRadius: 6,
  padding: '8px 10px',
  fontSize: 14,
  width: '100%',
  fontFamily: 'inherit',
  transition: 'border-color 0.1s, box-shadow 0.1s',
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

function getNextWeekday(weekday: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  const diff = (weekday - d.getDay() + 7) % 7
  d.setDate(d.getDate() + diff)
  // toISOString は UTC になるので、ローカル日付を直接組み立てる
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function FocusInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      {...props}
      style={{
        ...inputBase,
        ...(props.style as React.CSSProperties),
        borderColor: focused ? '#37352F' : '#E9E9E7',
        boxShadow: focused ? '0 0 0 2px rgba(55,53,47,0.1)' : 'none',
      }}
      onFocus={e => { setFocused(true); props.onFocus?.(e) }}
      onBlur={e => { setFocused(false); props.onBlur?.(e) }}
    />
  )
}

function FocusTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const [focused, setFocused] = useState(false)
  return (
    <textarea
      {...props}
      style={{
        ...inputBase,
        resize: 'none',
        ...(props.style as React.CSSProperties),
        borderColor: focused ? '#37352F' : '#E9E9E7',
        boxShadow: focused ? '0 0 0 2px rgba(55,53,47,0.1)' : 'none',
      }}
      onFocus={e => { setFocused(true); props.onFocus?.(e) }}
      onBlur={e => { setFocused(false); props.onBlur?.(e) }}
    />
  )
}

export default function TaskForm({ initial = {}, allTags, onSubmit, onCancel, submitLabel = 'タスクを追加' }: TaskFormProps) {
  const [title, setTitle] = useState(initial.title || '')
  const [deadline, setDeadline] = useState(initial.deadline || '')
  const [deadlineTime, setDeadlineTime] = useState(initial.deadlineTime || '')
  const [priority, setPriority] = useState<Priority>(initial.priority || 'medium')
  const [weight, setWeight] = useState<Weight>(initial.weight || '中')
  const [memo, setMemo] = useState(initial.memo || '')
  const [repeat, setRepeat] = useState<RepeatConfig | null>(initial.repeat || null)
  const [tags, setTags] = useState<string[]>(initial.tags || [])

  // 曜日が設定されたら締切日を自動的に次のその曜日に更新
  useEffect(() => {
    if (repeat?.type === 'weekly' && repeat.weekday !== undefined) {
      setDeadline(getNextWeekday(repeat.weekday))
    }
  }, [repeat?.type === 'weekly' ? repeat?.weekday : null]) // eslint-disable-line react-hooks/exhaustive-deps

  const weekdayLocked = repeat?.type === 'weekly' && repeat.weekday !== undefined

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onSubmit({
      title: title.trim(),
      deadline: deadline || null,
      deadlineTime: deadlineTime || undefined,
      priority,
      weight,
      memo,
      repeat,
      tags,
    })
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <FocusInput
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="タスクのタイトル"
        required
        autoFocus
        style={{ fontSize: 15, fontWeight: 500 }}
      />

      {/* Deadline row */}
      <div>
        <label style={labelBase}>
          締切
          {weekdayLocked && (
            <span style={{ marginLeft: 6, fontWeight: 400, color: '#C4C4C0', textTransform: 'none', letterSpacing: 0 }}>
              （毎週{WEEKDAY_LABELS[repeat!.weekday!]}に自動設定）
            </span>
          )}
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <FocusInput
            type="date"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
            disabled={weekdayLocked}
            style={{
              flex: 1,
              opacity: weekdayLocked ? 0.5 : 1,
              cursor: weekdayLocked ? 'not-allowed' : 'auto',
            }}
          />
          <FocusInput
            type="time"
            value={deadlineTime}
            onChange={e => setDeadlineTime(e.target.value)}
            style={{ width: 120 }}
            placeholder="23:59"
          />
        </div>
        {!deadlineTime && (
          <p style={{ fontSize: 11, color: '#C4C4C0', marginTop: 4 }}>時間未設定 = 23:59 扱い</p>
        )}
      </div>

      {/* Priority row */}
      <div>
        <label style={labelBase}>優先度</label>
        <div style={{ display: 'flex', gap: 5 }}>
          {priorities.map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPriority(p.value)}
              style={{
                flex: 1,
                padding: '7px 4px',
                borderRadius: 5,
                fontSize: 12,
                fontWeight: 600,
                border: `1px solid ${priority === p.value ? p.color + '60' : '#E9E9E7'}`,
                background: priority === p.value ? p.bg : '#FAFAF8',
                color: priority === p.value ? p.color : '#9B9A97',
                transition: 'all 0.1s',
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Weight row */}
      <div>
        <label style={labelBase}>重さ</label>
        <div style={{ display: 'flex', gap: 5 }}>
          {weights.map(w => (
            <button
              key={w.value}
              type="button"
              onClick={() => setWeight(w.value)}
              style={{
                flex: 1,
                padding: '7px 4px',
                borderRadius: 5,
                fontSize: 12,
                fontWeight: 600,
                border: `1px solid ${weight === w.value ? w.color + '60' : '#E9E9E7'}`,
                background: weight === w.value ? w.bg : '#FAFAF8',
                color: weight === w.value ? w.color : '#C4C4C0',
                transition: 'all 0.1s',
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={labelBase}>タグ</label>
        <TagInput value={tags} onChange={setTags} suggestions={allTags} />
      </div>

      <div>
        <label style={labelBase}>メモ</label>
        <FocusTextarea
          value={memo}
          onChange={e => setMemo(e.target.value)}
          placeholder="メモを追加…"
          rows={2}
        />
      </div>

      <RepeatForm value={repeat} onChange={setRepeat} />

      <div style={{ display: 'flex', gap: 8, paddingTop: 2 }}>
        <button
          type="submit"
          style={{
            flex: 1, padding: '8px 16px', borderRadius: 6,
            fontSize: 13, fontWeight: 600,
            background: '#37352F', color: '#FFFFFF',
            border: 'none', fontFamily: 'inherit', cursor: 'pointer',
            transition: 'background 0.1s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#1A1A1A')}
          onMouseLeave={e => (e.currentTarget.style.background = '#37352F')}
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '8px 16px', borderRadius: 6,
            fontSize: 13,
            background: '#EFEEEB', color: '#9B9A97',
            border: '1px solid #E9E9E7',
            fontFamily: 'inherit', cursor: 'pointer',
            transition: 'background 0.1s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#E5E4E1')}
          onMouseLeave={e => (e.currentTarget.style.background = '#EFEEEB')}
        >
          キャンセル
        </button>
      </div>
    </form>
  )
}
