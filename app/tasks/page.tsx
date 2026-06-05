'use client'

import { useEffect, useState, useCallback } from 'react'
import { Task, Priority } from '@/types'
import TaskCard from '@/components/TaskCard'
import TaskForm from '@/components/TaskForm'
import InlineAIChat from '@/components/InlineAIChat'

type SortMode = 'deadline' | 'priority'
const priorityOrder: Record<Priority, number> = { high: 0, medium: 1, low: 2 }

function getMondayOf(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0, 0, 0, 0)
  return d
}

type WeekGroup = { key: string; label: string; tasks: Task[] }

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [sortMode, setSortMode] = useState<SortMode>('deadline')
  const [filterTag, setFilterTag] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks')
      const data: Task[] = await res.json()
      setTasks(data)
      const tagSet = new Set<string>()
      data.forEach(t => t.tags.forEach(tag => tagSet.add(tag)))
      setAllTags(Array.from(tagSet))
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCreate = async (data: Partial<Task>) => {
    await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    setShowForm(false)
    fetchData()
  }

  const handleUpdate = async (id: string, data: Partial<Task>, repeatMode?: 'single' | 'future' | 'all') => {
    await fetch(`/api/tasks/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, repeatMode }) })
    fetchData()
  }
  const handleDelete = async (id: string, repeatMode: 'single' | 'future') => {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ repeatMode }) })
    fetchData()
  }

  let displayTasks = filterTag ? tasks.filter(t => t.tags.includes(filterTag)) : tasks
  displayTasks = [...displayTasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    if (sortMode === 'priority') {
      const diff = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (diff !== 0) return diff
      return (a.deadline || '').localeCompare(b.deadline || '')
    }
    if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline)
    if (a.deadline) return -1
    if (b.deadline) return 1
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })

  const incomplete = displayTasks.filter(t => !t.completed)
  const completed = displayTasks.filter(t => t.completed)

  // Group incomplete tasks by week (Monday-based)
  const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0)
  const currentMonday = getMondayOf(todayMidnight)
  const currentMondayStr = currentMonday.toISOString().slice(0, 10)

  const groupMap = new Map<string, Task[]>()
  for (const task of displayTasks) {
    let key: string
    if (!task.deadline) {
      key = 'none'
    } else {
      const monday = getMondayOf(new Date(task.deadline + 'T00:00:00'))
      const mondayStr = monday.toISOString().slice(0, 10)
      key = mondayStr < currentMondayStr ? 'overdue' : mondayStr
    }
    if (!groupMap.has(key)) groupMap.set(key, [])
    groupMap.get(key)!.push(task)
  }

  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`
  const weekGroups: WeekGroup[] = []
  if (groupMap.has('overdue')) weekGroups.push({ key: 'overdue', label: '期限切れ', tasks: groupMap.get('overdue')! })
  const weekKeys = [...groupMap.keys()].filter(k => k !== 'overdue' && k !== 'none').sort()
  for (const key of weekKeys) {
    const monday = new Date(key + 'T00:00:00')
    const sunday = new Date(monday); sunday.setDate(sunday.getDate() + 6)
    const offset = Math.round((monday.getTime() - currentMonday.getTime()) / (7 * 86400000))
    const range = `${fmt(monday)} - ${fmt(sunday)}`
    const label = offset === 0 ? `今週  ${range}` : offset === 1 ? `来週  ${range}` : `${monday.getMonth() + 1}月第${Math.ceil(monday.getDate() / 7)}週  ${range}`
    weekGroups.push({ key, label, tasks: groupMap.get(key)! })
  }
  if (groupMap.has('none')) weekGroups.push({ key: 'none', label: '期限なし', tasks: groupMap.get('none')! })

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #E9E9E7', borderTopColor: '#37352F', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 20px 96px' }}>
      {/* Header */}
      <div style={{ padding: '40px 0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 30, fontWeight: 700, color: '#37352F', letterSpacing: '-0.5px' }}>Tasks</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '7px 14px',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            background: showForm ? '#EFEEEB' : '#37352F',
            color: showForm ? '#9B9A97' : '#FFFFFF',
            border: 'none',
            fontFamily: 'inherit',
            cursor: 'pointer',
            transition: 'all 0.1s',
          }}
        >
          {showForm ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              閉じる
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              新規タスク
            </>
          )}
        </button>
      </div>

      <InlineAIChat onAdded={fetchData} />

      {/* Add Form */}
      {showForm && (
        <div style={{
          marginBottom: 20,
          padding: 16,
          borderRadius: 8,
          background: '#FFFFFF',
          border: '1px solid #E9E9E7',
          boxShadow: '0 4px 12px rgba(55,53,47,0.06)',
        }}>
          <TaskForm
            initial={{}}
            allTags={allTags}
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div style={{ display: 'flex', background: '#EFEEEB', borderRadius: 6, padding: 2, gap: 1 }}>
          {(['deadline', 'priority'] as SortMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setSortMode(mode)}
              style={{
                padding: '5px 12px',
                borderRadius: 5,
                fontSize: 12,
                fontWeight: 600,
                background: sortMode === mode ? '#FFFFFF' : 'transparent',
                color: sortMode === mode ? '#37352F' : '#9B9A97',
                border: 'none',
                fontFamily: 'inherit',
                cursor: 'pointer',
                boxShadow: sortMode === mode ? '0 1px 3px rgba(55,53,47,0.08)' : 'none',
                transition: 'all 0.1s',
              }}
            >
              {mode === 'deadline' ? '締切順' : '優先度順'}
            </button>
          ))}
        </div>

        {allTags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            <FilterPill label="すべて" active={filterTag === null} onClick={() => setFilterTag(null)} />
            {allTags.map(tag => (
              <FilterPill key={tag} label={tag} active={filterTag === tag} onClick={() => setFilterTag(filterTag === tag ? null : tag)} />
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      {(incomplete.length > 0 || completed.length > 0) && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: '#9B9A97' }}>
            <span style={{ fontWeight: 600, color: '#37352F' }}>{incomplete.length}</span> 件残り
          </span>
          {completed.length > 0 && (
            <span style={{ fontSize: 12, color: '#9B9A97' }}>
              <span style={{ fontWeight: 600, color: '#37352F' }}>{completed.length}</span> 件完了
            </span>
          )}
        </div>
      )}

      {/* Empty State */}
      {incomplete.length === 0 && completed.length === 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '48px 24px',
          borderRadius: 8,
          border: '1px dashed #E9E9E7',
          background: '#FAFAF8',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D3D3CF" strokeWidth="1.3" style={{ marginBottom: 10 }}>
            <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
          <p style={{ fontSize: 14, fontWeight: 500, color: '#9B9A97', marginBottom: 4 }}>タスクがありません</p>
          <p style={{ fontSize: 12, color: '#C4C4C0' }}>「新規タスク」から追加しましょう</p>
        </div>
      )}

      {/* Tasks grouped by week */}
      {weekGroups.map(group => (
        <div key={group.key} style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: group.key === 'overdue' ? '#E03E3E' : '#C4C4C0', marginBottom: 8 }}>
            {group.label}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {group.tasks.map(task => (
              <TaskCard key={task.id} task={task} allTags={allTags} onUpdate={handleUpdate} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '4px 10px',
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 500,
        background: active ? '#37352F' : hov ? '#E5E4E1' : '#EFEEEB',
        color: active ? '#FFFFFF' : '#9B9A97',
        border: 'none',
        fontFamily: 'inherit',
        cursor: 'pointer',
        transition: 'all 0.1s',
      }}
    >
      {label}
    </button>
  )
}
