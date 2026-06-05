'use client'

import { useState, useEffect, useCallback } from 'react'
import { CalendarEvent, RepeatConfig, Task, Priority } from '@/types'
import RepeatForm from './RepeatForm'
import TagInput from './TagInput'
import DeleteRepeatDialog from './DeleteRepeatDialog'
import EditRepeatDialog from './EditRepeatDialog'

interface EventModalProps {
  event?: CalendarEvent | null
  defaultDate?: string
  defaultRow?: 1 | 2 | 3 | 4
  prefill?: Partial<CalendarEvent>
  allTags: string[]
  onClose: () => void
  onSubmit: (data: Partial<CalendarEvent>, repeatMode?: 'single' | 'future' | 'all') => void
  onDelete?: (id: string, repeatMode: 'single' | 'future') => void
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

function getNextWeekday(weekday: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  const diff = (weekday - d.getDay() + 7) % 7
  d.setDate(d.getDate() + diff)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function EventModal({ event, defaultDate, defaultRow = 1, prefill, allTags, onClose, onSubmit, onDelete }: EventModalProps) {
  const [title, setTitle] = useState(event?.title || prefill?.title || '')
  const [date, setDate] = useState(event?.date || prefill?.date || defaultDate || '')
  const [endDate, setEndDate] = useState(event?.endDate || prefill?.endDate || '')
  const [startTime, setStartTime] = useState(event?.startTime || prefill?.startTime || '')
  const [endTime, setEndTime] = useState(event?.endTime || prefill?.endTime || '')
  const [location, setLocation] = useState(event?.location || prefill?.location || '')
  const [memo, setMemo] = useState(event?.memo || prefill?.memo || '')
  const [repeat, setRepeat] = useState<RepeatConfig | null>(event?.repeat || null)
  const [tags, setTags] = useState<string[]>(event?.tags || prefill?.tags || [])
  const [rows, setRows] = useState<(1 | 2 | 3 | 4)[]>(event?.rows || prefill?.rows || [defaultRow])
  const [color, setColor] = useState(event?.color || prefill?.color || '#787774')
  const [manualColor, setManualColor] = useState(!!(event?.color || prefill?.color))
  const [tagColors, setTagColors] = useState<Record<string, string>>({})
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Linked tasks (only for existing events)
  const [linkedTasks, setLinkedTasks] = useState<Task[]>([])
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDeadline, setNewTaskDeadline] = useState('')
  const [newTaskDeadlineTime, setNewTaskDeadlineTime] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('medium')
  const [taskSaving, setTaskSaving] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [pendingData, setPendingData] = useState<Partial<CalendarEvent> | null>(null)

  useEffect(() => {
    fetch('/api/tag-colors').then(r => r.json()).then(setTagColors).catch(() => {})
  }, [])

  const reloadLinkedTasks = useCallback(async () => {
    if (!event?.linkedTaskIds?.length) { setLinkedTasks([]); return }
    try {
      const res = await fetch('/api/tasks')
      const all: Task[] = await res.json()
      setLinkedTasks(all.filter(t => event.linkedTaskIds.includes(t.id)))
    } catch { /* ignore */ }
  }, [event?.id, JSON.stringify(event?.linkedTaskIds)]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { reloadLinkedTasks() }, [reloadLinkedTasks])

  useEffect(() => {
    if (manualColor) return
    const autoColor = tags.map(t => tagColors[t]).find(Boolean)
    if (autoColor) setColor(autoColor)
    else if (tags.length === 0) setColor('#787774')
  }, [tags, tagColors, manualColor])

  const weekdayLocked = repeat?.type === 'weekly' && repeat.weekday !== undefined

  useEffect(() => {
    if (repeat?.type === 'weekly' && repeat.weekday !== undefined) {
      setDate(getNextWeekday(repeat.weekday))
    }
  }, [repeat?.type === 'weekly' ? repeat?.weekday : null]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleRow = (r: 1 | 2 | 3 | 4) => {
    setRows(prev =>
      prev.includes(r)
        ? prev.length > 1 ? prev.filter(x => x !== r) : prev
        : [...prev, r].sort() as (1 | 2 | 3 | 4)[]
    )
  }

  const createLinkedTask = async () => {
    if (!newTaskTitle.trim() || !event || taskSaving) return
    setTaskSaving(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          deadline: newTaskDeadline || null,
          deadlineTime: newTaskDeadlineTime || undefined,
          priority: newTaskPriority,
          memo: '', tags: [],
          linkedEventIds: [event.id],
        }),
      })
      const newTask: Task = await res.json()
      await fetch(`/api/events/${event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkedTaskIds: [...(event.linkedTaskIds || []), newTask.id] }),
      })
      setNewTaskTitle('')
      setNewTaskDeadline('')
      setNewTaskDeadlineTime('')
      setNewTaskPriority('medium')
      setShowTaskForm(false)
      await reloadLinkedTasks()
      // keep event.linkedTaskIds fresh in parent on next submit
      event.linkedTaskIds = [...(event.linkedTaskIds || []), newTask.id]
    } finally {
      setTaskSaving(false)
    }
  }

  const toggleTaskComplete = async (task: Task) => {
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !task.completed }),
    })
    await reloadLinkedTasks()
  }

  const isAIPrefilled = !event && !!prefill?.title

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const data = { title: title.trim(), date, endDate: endDate && endDate > date ? endDate : undefined, startTime, endTime, location, memo, repeat, tags, rows, color }
    if (event?.repeatGroupId) {
      setPendingData(data)
      setShowEditDialog(true)
    } else {
      onSubmit(data)
    }
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <div
          style={{ position: 'absolute', inset: 0, background: 'rgba(55,53,47,0.3)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        />
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 480,
            maxHeight: '92dvh',
            overflowY: 'auto',
            borderRadius: '12px 12px 0 0',
            background: '#FFFFFF',
            boxShadow: '0 -4px 40px rgba(55,53,47,0.12)',
          }}
        >
          {/* Drag handle */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E9E9E7' }} />
          </div>

          {/* Header */}
          <div style={{ padding: '8px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: '#37352F' }}>
                {event ? '予定を編集' : '予定を追加'}
              </h2>
              {isAIPrefilled && (
                <span style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '2px 8px', borderRadius: 4,
                  fontSize: 11, fontWeight: 600,
                  background: '#EEF0FF', color: '#6E5ED2',
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 3l1.88 5.76L19.5 9l-5.62 1.24L12 16l-1.88-6.76L4.5 9l5.62-1.24L12 3z" />
                  </svg>
                  AI解析済み
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              style={{
                width: 28, height: 28, borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#9B9A97', background: 'transparent', border: 'none', cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#EFEEEB')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="タイトル（例：授業 10:45~18:00）"
              required
              autoFocus
              style={{ ...inputBase, fontSize: 15, fontWeight: 500 }}
            />

            {event && (
              <div style={{ borderRadius: 8, border: '1px solid #E9E9E7', overflow: 'hidden' }}>
                <div style={{ padding: '8px 12px', background: '#F7F6F3', borderBottom: linkedTasks.length > 0 || showTaskForm ? '1px solid #E9E9E7' : 'none' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#9B9A97', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    関連タスク {linkedTasks.length > 0 && `(${linkedTasks.length})`}
                  </span>
                </div>
                {linkedTasks.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {linkedTasks.map((task, i) => (
                      <div key={task.id} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 12px',
                        borderBottom: i < linkedTasks.length - 1 || showTaskForm ? '1px solid #F0EFEC' : 'none',
                        background: task.completed ? '#FAFAF8' : '#FFFFFF',
                      }}>
                        <button
                          type="button"
                          onClick={() => toggleTaskComplete(task)}
                          style={{
                            flexShrink: 0, width: 15, height: 15, borderRadius: 3,
                            border: `1.5px solid ${task.completed ? '#37352F' : '#D3D3CF'}`,
                            background: task.completed ? '#37352F' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          {task.completed && (
                            <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                              <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                        <span style={{ flex: 1, fontSize: 13, color: task.completed ? '#9B9A97' : '#37352F', textDecoration: task.completed ? 'line-through' : 'none' }}>
                          {task.title}
                        </span>
                        {task.deadline && <span style={{ fontSize: 11, color: '#9B9A97', flexShrink: 0 }}>{task.deadline}</span>}
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '1px 5px', borderRadius: 3, flexShrink: 0,
                          background: task.priority === 'high' ? '#FFEAEA' : task.priority === 'medium' ? '#FFF3E0' : '#EDE9FE',
                          color: task.priority === 'high' ? '#E03E3E' : task.priority === 'medium' ? '#D9730D' : '#6E5ED2',
                        }}>
                          {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {showTaskForm ? (
                  <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, background: '#FFFFFF' }}>
                    <input
                      type="text"
                      value={newTaskTitle}
                      onChange={e => setNewTaskTitle(e.target.value)}
                      placeholder="タスク名"
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); createLinkedTask() } }}
                      style={{ ...inputBase, fontSize: 13 }}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                      <div>
                        <label style={{ ...labelBase, marginBottom: 4 }}>締切日</label>
                        <input type="date" value={newTaskDeadline} onChange={e => setNewTaskDeadline(e.target.value)} style={{ ...inputBase, fontSize: 13 }} />
                      </div>
                      <div>
                        <label style={{ ...labelBase, marginBottom: 4 }}>時間</label>
                        <input type="time" value={newTaskDeadlineTime} onChange={e => setNewTaskDeadlineTime(e.target.value)} style={{ ...inputBase, fontSize: 13 }} />
                      </div>
                      <div>
                        <label style={{ ...labelBase, marginBottom: 4 }}>優先度</label>
                        <select value={newTaskPriority} onChange={e => setNewTaskPriority(e.target.value as Priority)} style={{ ...inputBase, fontSize: 13 }}>
                          <option value="high">高</option>
                          <option value="medium">中</option>
                          <option value="low">低</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        onClick={createLinkedTask}
                        disabled={!newTaskTitle.trim() || taskSaving}
                        style={{
                          flex: 1, padding: '7px', borderRadius: 5, fontSize: 12, fontWeight: 600,
                          background: newTaskTitle.trim() && !taskSaving ? '#37352F' : '#EFEEEB',
                          color: newTaskTitle.trim() && !taskSaving ? '#FFFFFF' : '#9B9A97',
                          border: 'none', fontFamily: 'inherit', cursor: newTaskTitle.trim() && !taskSaving ? 'pointer' : 'default',
                        }}
                      >
                        {taskSaving ? '作成中…' : '作成'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowTaskForm(false); setNewTaskTitle(''); setNewTaskDeadline(''); setNewTaskDeadlineTime('') }}
                        style={{ padding: '7px 12px', borderRadius: 5, fontSize: 12, background: '#EFEEEB', color: '#9B9A97', border: 'none', fontFamily: 'inherit', cursor: 'pointer' }}
                      >キャンセル</button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setShowTaskForm(true); setNewTaskDeadline(event.date); setNewTaskDeadlineTime(event.startTime || '') }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5, width: '100%',
                      padding: '8px 12px', fontSize: 12, fontWeight: 500,
                      background: '#FFFFFF', color: '#9B9A97',
                      border: 'none', fontFamily: 'inherit', cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F7F6F3')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#FFFFFF')}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    関連タスクを追加
                  </button>
                )}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelBase}>
                  開始日
                  {weekdayLocked && (
                    <span style={{ marginLeft: 6, fontWeight: 400, color: '#C4C4C0', textTransform: 'none', letterSpacing: 0, fontSize: 10 }}>
                      （曜日に自動設定）
                    </span>
                  )}
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={e => { setDate(e.target.value); if (endDate && e.target.value > endDate) setEndDate('') }}
                  required
                  disabled={weekdayLocked}
                  style={{ ...inputBase, opacity: weekdayLocked ? 0.5 : 1, cursor: weekdayLocked ? 'not-allowed' : 'auto' }}
                />
              </div>
              <div>
                <label style={labelBase}>終了日（複数日）</label>
                <input
                  type="date"
                  value={endDate}
                  min={date || undefined}
                  onChange={e => setEndDate(e.target.value)}
                  style={{ ...inputBase }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                {endDate && endDate > date && (
                  <button
                    type="button"
                    onClick={() => setEndDate('')}
                    style={{ fontSize: 11, color: '#9B9A97', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, fontFamily: 'inherit' }}
                  >
                    ✕ 終了日をクリア
                  </button>
                )}
              </div>
              <div>
                <label style={labelBase}>行（複数選択可）</label>
                <div style={{ display: 'flex', gap: 4 }}>
                  {([1, 2, 3, 4] as const).map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => toggleRow(r)}
                      style={{
                        flex: 1, padding: '7px 4px',
                        borderRadius: 5, fontSize: 13, fontWeight: 600,
                        background: rows.includes(r) ? '#37352F' : '#FAFAF8',
                        color: rows.includes(r) ? '#FFFFFF' : '#9B9A97',
                        border: `1px solid ${rows.includes(r) ? '#37352F' : '#E9E9E7'}`,
                        fontFamily: 'inherit', cursor: 'pointer',
                        transition: 'all 0.1s',
                      }}
                    >{r}</button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelBase}>開始時間</label>
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={inputBase} />
              </div>
              <div>
                <label style={labelBase}>終了時間</label>
                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={inputBase} />
              </div>
            </div>

            <div>
              <label style={labelBase}>場所</label>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="任意" style={inputBase} />
            </div>

            <div>
              <label style={labelBase}>カラー</label>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {[
                  '#787774', '#9F6B53', '#D9730D', '#CB912F',
                  '#448361', '#337EA9', '#9065B0', '#C14C8A', '#D44C47',
                  '#6B7280', '#0EA5E9', '#10B981', '#F59E0B',
                  '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
                ].map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => { setColor(c); setManualColor(true) }}
                    style={{
                      width: 26, height: 26, borderRadius: '50%',
                      background: c,
                      border: color === c ? '3px solid #37352F' : '3px solid transparent',
                      outline: color === c ? '2px solid #FFFFFF' : 'none',
                      outlineOffset: -4,
                      cursor: 'pointer',
                      transition: 'transform 0.1s',
                      flexShrink: 0,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.2)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                  />
                ))}
              </div>
            </div>

            <div>
              <label style={labelBase}>タグ</label>
              <TagInput value={tags} onChange={setTags} suggestions={allTags} />
            </div>

            <div>
              <label style={labelBase}>メモ</label>
              <textarea
                value={memo}
                onChange={e => setMemo(e.target.value)}
                placeholder="メモを追加…"
                rows={2}
                style={{ ...inputBase, resize: 'none' }}
              />
            </div>

            <RepeatForm value={repeat} onChange={setRepeat} mode="event" />

            <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
              <button
                type="submit"
                style={{
                  flex: 1, padding: '9px 16px', borderRadius: 6,
                  fontSize: 13, fontWeight: 600,
                  background: '#37352F', color: '#FFFFFF',
                  border: 'none', fontFamily: 'inherit', cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#1A1A1A')}
                onMouseLeave={e => (e.currentTarget.style.background = '#37352F')}
              >
                {event ? '保存' : '追加'}
              </button>
              {event && onDelete && (
                <button
                  type="button"
                  onClick={() => event.repeatGroupId ? setShowDeleteDialog(true) : (onDelete(event.id, 'single'), onClose())}
                  style={{
                    padding: '9px 14px', borderRadius: 6,
                    fontSize: 13, fontWeight: 600,
                    background: '#FFEAEA', color: '#E03E3E',
                    border: '1px solid #FECACA',
                    fontFamily: 'inherit', cursor: 'pointer',
                    transition: 'background 0.1s',
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
                  padding: '9px 14px', borderRadius: 6,
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
        </div>
      </div>

      {showDeleteDialog && event && onDelete && (
        <DeleteRepeatDialog
          type="event"
          onClose={() => setShowDeleteDialog(false)}
          onDeleteSingle={() => { onDelete(event.id, 'single'); setShowDeleteDialog(false); onClose() }}
          onDeleteFuture={() => { onDelete(event.id, 'future'); setShowDeleteDialog(false); onClose() }}
        />
      )}

      {showEditDialog && pendingData && (
        <EditRepeatDialog
          type="event"
          onClose={() => { setShowEditDialog(false); setPendingData(null) }}
          onSaveSingle={() => { onSubmit(pendingData, 'single'); setShowEditDialog(false); setPendingData(null) }}
          onSaveFuture={() => { onSubmit(pendingData, 'future'); setShowEditDialog(false); setPendingData(null) }}
          onSaveAll={() => { onSubmit(pendingData, 'all'); setShowEditDialog(false); setPendingData(null) }}
        />
      )}
    </>
  )
}
