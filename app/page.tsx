'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Task, CalendarEvent, CalendarPeriod } from '@/types'
import TaskCard from '@/components/TaskCard'
import { PERIOD_COLORS } from '@/components/PeriodModal'

const WEEKDAYS = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日']
const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

function getTodayStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function getDateOffsetStr(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getDateInfo(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return {
    dayLabel: WEEKDAYS[d.getDay()],
    dateLabel: `${MONTHS[d.getMonth()]} ${d.getDate()}日`,
    yearLabel: d.getFullYear(),
  }
}

export default function TodayPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [periods, setPeriods] = useState<CalendarPeriod[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [viewOffset, setViewOffset] = useState(0)

  // Drag & drop (local only — does not persist to server)
  const [draggingKey, setDraggingKey] = useState<string | null>(null)
  const [dragSource, setDragSource] = useState<'due' | 'timeline' | null>(null)
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)
  const [extraTimelineIds, setExtraTimelineIds] = useState<string[]>([])
  const [localOrder, setLocalOrder] = useState<string[] | null>(null)
  const baseKeysRef = useRef<string[]>([])

  const todayStr = getTodayStr()
  const viewDateStr = getDateOffsetStr(viewOffset)
  const isToday = viewOffset === 0
  const { dayLabel, dateLabel, yearLabel } = getDateInfo(viewDateStr)

  const fetchData = useCallback(async () => {
    try {
      const [tasksRes, eventsRes, periodsRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/events'),
        fetch('/api/periods'),
      ])
      const tasksData: Task[] = await tasksRes.json()
      const eventsData: CalendarEvent[] = await eventsRes.json()
      const periodsData: CalendarPeriod[] = await periodsRes.json()
      setTasks(tasksData)
      setEvents(eventsData)
      setPeriods(periodsData)
      const tagSet = new Set<string>()
      tasksData.forEach(t => t.tags.forEach(tag => tagSet.add(tag)))
      setAllTags(Array.from(tagSet))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const extraIdSet = new Set(extraTimelineIds)
  const extraTasks = extraTimelineIds
    .map(id => tasks.find(t => t.id === id))
    .filter((t): t is Task => t !== undefined)

  const timelineEvents = events
    .filter(e => e.date === viewDateStr)
    .sort((a, b) => (a.startTime || '99:99').localeCompare(b.startTime || '99:99'))

  const timelineTasks = tasks
    .filter(t => t.timelineDate === viewDateStr)
    .sort((a, b) => (a.timelineOrder ?? 0) - (b.timelineOrder ?? 0))

  const fiveDaysLaterStr = getDateOffsetStr(5)
  const fourteenDaysLaterStr = getDateOffsetStr(14)

  const dueTasks = isToday
    ? tasks
        .filter(t =>
          t.deadline &&
          t.deadline !== viewDateStr &&
          !extraIdSet.has(t.id) &&
          (t.deadline <= fiveDaysLaterStr || (t.weight === '大' && t.deadline <= fourteenDaysLaterStr))
        )
        .sort((a, b) => {
          if (a.completed !== b.completed) return a.completed ? 1 : -1
          return (a.deadline || '').localeCompare(b.deadline || '')
        })
    : tasks
        .filter(t => t.deadline === viewDateStr && !extraIdSet.has(t.id))
        .sort((a, b) => {
          if (a.completed !== b.completed) return a.completed ? 1 : -1
          const po: Record<string, number> = { high: 0, medium: 1, low: 2 }
          return po[a.priority] - po[b.priority]
        })

  const handleUpdate = async (id: string, data: Partial<Task>, repeatMode?: 'single' | 'future' | 'all') => {
    await fetch(`/api/tasks/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, repeatMode }) })
    fetchData()
  }
  const handleDelete = async (id: string, repeatMode: 'single' | 'future') => {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ repeatMode }) })
    fetchData()
  }
  const handleToggleTimeline = async (task: Task) => {
    if (extraIdSet.has(task.id)) {
      setExtraTimelineIds(prev => prev.filter(id => id !== task.id))
      setLocalOrder(prev => prev ? prev.filter(k => k !== 'extra-' + task.id) : null)
      return
    }
    if (task.timelineDate === viewDateStr) {
      await handleUpdate(task.id, { timelineDate: null, timelineOrder: null })
    } else {
      const maxOrder = timelineTasks.reduce((max, t) => Math.max(max, t.timelineOrder ?? 0), 0)
      await handleUpdate(task.id, { timelineDate: viewDateStr, timelineOrder: maxOrder + 1 })
    }
  }

  const activePeriods = periods.filter(p => {
    if (!p.repeat) return viewDateStr >= p.startDate && viewDateStr <= p.endDate
    const d = new Date(viewDateStr + 'T00:00:00')
    const day = d.getDate()
    return day >= p.repeat.startDay && day <= p.repeat.endDay
  })

  const timelineDeadlineTasks = tasks
    .filter(t => t.deadline === viewDateStr && t.timelineDate !== viewDateStr && !extraIdSet.has(t.id))

  const baseTimelineItems = [
    ...timelineEvents.map(e => ({
      type: 'event' as const,
      item: e as CalendarEvent | Task,
      key: e.id,
      sort: e.startTime || '99:99',
    })),
    ...timelineDeadlineTasks.map(t => ({
      type: 'task' as const,
      item: t as CalendarEvent | Task,
      key: 'deadline-' + t.id,
      sort: t.deadlineTime || '99:9999',
    })),
    ...timelineTasks.map(t => ({
      type: 'task' as const,
      item: t as CalendarEvent | Task,
      key: t.id,
      sort: '98:' + String(t.timelineOrder ?? 0).padStart(4, '0'),
    })),
    ...extraTasks
      .filter(t => t.timelineDate !== viewDateStr && t.deadline !== viewDateStr)
      .map((t, i) => ({
        type: 'task' as const,
        item: t as CalendarEvent | Task,
        key: 'extra-' + t.id,
        sort: '99:' + String(i).padStart(4, '0'),
      })),
  ].sort((a, b) => {
    const cmp = a.sort.localeCompare(b.sort)
    if (cmp !== 0) return cmp
    if (a.type === 'task' && b.type === 'event') return -1
    if (a.type === 'event' && b.type === 'task') return 1
    return 0
  })

  const baseKeys = baseTimelineItems.map(x => x.key)
  baseKeysRef.current = baseKeys

  // Merge custom order with base: preserve order, append newly appeared items at end
  const effectiveOrder = localOrder
    ? [
        ...localOrder.filter(k => baseKeys.includes(k)),
        ...baseKeys.filter(k => !localOrder.includes(k)),
      ]
    : null

  const timelineItems = effectiveOrder
    ? effectiveOrder.map(k => baseTimelineItems.find(x => x.key === k)).filter((x): x is typeof baseTimelineItems[0] => x !== undefined)
    : baseTimelineItems

  // Drag handlers
  const handleDragEnd = () => {
    setDraggingKey(null)
    setDragSource(null)
    setDragOverKey(null)
  }

  const getWorkingOrder = () => {
    const base = baseKeysRef.current
    return localOrder
      ? [...localOrder.filter(k => base.includes(k)), ...base.filter(k => !localOrder.includes(k))]
      : [...base]
  }

  const handleTimelineTaskDrop = (targetKey: string) => (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!draggingKey || draggingKey === targetKey) { handleDragEnd(); return }
    const order = getWorkingOrder()
    if (dragSource === 'due') {
      const extraKey = 'extra-' + draggingKey
      if (!order.includes(extraKey)) {
        const newOrder = [...order]
        const idx = newOrder.indexOf(targetKey)
        newOrder.splice(idx >= 0 ? idx : newOrder.length, 0, extraKey)
        setExtraTimelineIds(prev => [...prev, draggingKey])
        setLocalOrder(newOrder)
      }
    } else if (dragSource === 'timeline') {
      const newOrder = order.filter(k => k !== draggingKey)
      const idx = newOrder.indexOf(targetKey)
      newOrder.splice(idx >= 0 ? idx : newOrder.length, 0, draggingKey)
      setLocalOrder(newOrder)
    }
    handleDragEnd()
  }

  const handleTimelineEndDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (!draggingKey) { handleDragEnd(); return }
    const order = getWorkingOrder()
    if (dragSource === 'due') {
      const extraKey = 'extra-' + draggingKey
      if (!order.includes(extraKey)) {
        setExtraTimelineIds(prev => [...prev, draggingKey])
        setLocalOrder([...order, extraKey])
      }
    } else if (dragSource === 'timeline') {
      setLocalOrder([...order.filter(k => k !== draggingKey), draggingKey])
    }
    handleDragEnd()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #E9E9E7', borderTopColor: '#37352F', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  // Build grouped timeline rendering
  const groups: Array<{ event?: CalendarEvent; tasks: Array<{ task: Task; key: string }> }> = []
  let cur: typeof groups[0] = { tasks: [] }
  for (const { type, item, key } of timelineItems) {
    if (type === 'event') {
      if (cur.event || cur.tasks.length > 0) groups.push(cur)
      cur = { event: item as CalendarEvent, tasks: [] }
    } else {
      cur.tasks.push({ task: item as Task, key })
    }
  }
  if (cur.event || cur.tasks.length > 0) groups.push(cur)

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 20px 96px' }}>
      {/* Date Header */}
      <div style={{ padding: '40px 0 32px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 30, fontWeight: 700, color: '#37352F', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
                {dateLabel}
              </h1>
              <span style={{ fontSize: 14, color: '#9B9A97', fontWeight: 400 }}>{yearLabel}</span>
              {activePeriods.map(p => {
                const colorDef = PERIOD_COLORS.find(c => c.bg === p.color) ?? PERIOD_COLORS[0]
                return (
                  <span key={p.id} style={{
                    fontSize: 11, fontWeight: 600,
                    padding: '3px 8px', borderRadius: 5,
                    background: p.color, color: colorDef.text,
                    lineHeight: 1,
                  }}>
                    {p.title}
                  </span>
                )
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <p style={{ fontSize: 13, color: '#9B9A97', fontWeight: 500 }}>{dayLabel}</p>
              {!isToday && (
                <button
                  onClick={() => setViewOffset(0)}
                  style={{
                    fontSize: 11, fontWeight: 600,
                    padding: '2px 8px', borderRadius: 4,
                    background: '#EFEEEB', color: '#9B9A97',
                    border: '1px solid #E9E9E7',
                    fontFamily: 'inherit', cursor: 'pointer',
                    transition: 'all 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#E5E4E1')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#EFEEEB')}
                >
                  今日に戻る
                </button>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 6 }}>
            <NavArrow onClick={() => setViewOffset(v => v - 1)} direction="left" />
            <NavArrow onClick={() => setViewOffset(v => v + 1)} direction="right" />
          </div>
        </div>
      </div>

      {/* Timeline */}
      <section
        style={{ marginBottom: 32 }}
        onDragLeave={e => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverKey(null)
        }}
      >
        <SectionHeader label="タイムライン" count={timelineItems.length} />

        {timelineItems.length === 0 && dragSource !== 'due' && (
          <EmptyState message={`${isToday ? '今日' : 'この日'}の予定はありません`} />
        )}

        {(timelineItems.length > 0 || dragSource === 'due') && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {groups.map((group, gi) => (
              <div key={gi}>
                {group.event && <TimelineEventCard event={group.event} />}
                {(gi < groups.length - 1 || group.tasks.length > 0) && (
                  <div style={{
                    borderLeft: '1.5px solid #E9E9E7',
                    marginLeft: 18,
                    paddingLeft: 16,
                    paddingTop: group.tasks.length > 0 ? 6 : 0,
                    paddingBottom: group.tasks.length > 0 ? 6 : 10,
                    marginTop: group.event ? 4 : 0,
                    marginBottom: gi < groups.length - 1 ? 4 : 0,
                    display: 'flex', flexDirection: 'column', gap: 5,
                    minHeight: group.tasks.length === 0 ? 14 : undefined,
                  }}>
                    {group.tasks.map(({ task, key }) => (
                      <div
                        key={key}
                        draggable
                        onDragStart={e => {
                          e.dataTransfer.effectAllowed = 'move'
                          setDraggingKey(key)
                          setDragSource('timeline')
                        }}
                        onDragOver={e => {
                          e.preventDefault()
                          e.stopPropagation()
                          setDragOverKey(key)
                        }}
                        onDrop={handleTimelineTaskDrop(key)}
                        onDragEnd={handleDragEnd}
                        style={{
                          opacity: draggingKey === key ? 0.35 : 1,
                          outline: dragOverKey === key ? '2px dashed #37352F' : 'none',
                          outlineOffset: 2,
                          borderRadius: 6,
                          transition: 'opacity 0.1s',
                        }}
                      >
                        <TaskCard
                          task={task}
                          allTags={allTags}
                          onUpdate={handleUpdate}
                          onDelete={handleDelete}
                          showTimelineToggle={!key.startsWith('extra-')}
                          onToggleTimeline={handleToggleTimeline}
                          todayStr={todayStr}
                          viewDateStr={viewDateStr}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Drop zone at end — visible while dragging */}
            {dragSource !== null && (
              <div
                onDragOver={e => { e.preventDefault(); setDragOverKey('__end__') }}
                onDragLeave={() => setDragOverKey(k => k === '__end__' ? null : k)}
                onDrop={handleTimelineEndDrop}
                style={{
                  height: 38,
                  borderRadius: 6,
                  border: `2px dashed ${dragOverKey === '__end__' ? '#37352F' : '#D3D3CF'}`,
                  background: dragOverKey === '__end__' ? '#F5F5F3' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginTop: 8,
                  transition: 'all 0.15s',
                }}
              >
                <p style={{ fontSize: 12, color: dragOverKey === '__end__' ? '#37352F' : '#C4C4C0', userSelect: 'none' }}>
                  ここにドロップ
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Due Tasks */}
      <section>
        <SectionHeader
          label={isToday ? '直近5日のタスク' : 'この日のタスク'}
          count={dueTasks.length}
          urgent={isToday}
        />

        {dueTasks.length === 0 ? (
          <EmptyState message={isToday ? '直近5日のタスクはありません' : 'この日のタスクはありません'} done />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {dueTasks.map(task => (
              <div
                key={task.id}
                draggable
                onDragStart={e => {
                  e.dataTransfer.effectAllowed = 'move'
                  setDraggingKey(task.id)
                  setDragSource('due')
                }}
                onDragEnd={handleDragEnd}
                style={{
                  opacity: draggingKey === task.id ? 0.35 : 1,
                  transition: 'opacity 0.1s',
                }}
              >
                <TaskCard
                  task={task}
                  allTags={allTags}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  showTimelineToggle
                  onToggleTimeline={handleToggleTimeline}
                  todayStr={todayStr}
                  viewDateStr={viewDateStr}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function NavArrow({ onClick, direction }: { onClick: () => void; direction: 'left' | 'right' }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 32, height: 32,
        borderRadius: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: hov ? '#EFEEEB' : 'transparent',
        border: '1px solid #E9E9E7',
        color: '#9B9A97',
        cursor: 'pointer',
        transition: 'all 0.1s',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {direction === 'left'
          ? <polyline points="15 18 9 12 15 6" />
          : <polyline points="9 18 15 12 9 6" />}
      </svg>
    </button>
  )
}

function SectionHeader({ label, count, urgent }: { label: string; count: number; urgent?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <h2 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9B9A97' }}>
        {label}
      </h2>
      {count > 0 && (
        <span style={{
          fontSize: 11, fontWeight: 600,
          padding: '1px 6px', borderRadius: 4,
          background: urgent ? '#FFEAEA' : '#EFEEEB',
          color: urgent ? '#E03E3E' : '#9B9A97',
        }}>
          {count}
        </span>
      )}
    </div>
  )
}

function TimelineEventCard({ event: e }: { event: CalendarEvent }) {
  const [expanded, setExpanded] = useState(false)
  const [hovered, setHovered] = useState(false)
  const hasExtra = !!(e.memo || e.location)
  const accentColor = e.color || '#37352F'

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => hasExtra && setExpanded(x => !x)}
      style={{
        display: 'flex', gap: 12,
        padding: '12px 12px',
        background: '#FFFFFF',
        borderRadius: 6,
        border: '1px solid #E9E9E7',
        cursor: hasExtra ? 'pointer' : 'default',
        boxShadow: hovered && hasExtra ? '0 1px 4px rgba(55,53,47,0.06)' : 'none',
        transition: 'box-shadow 0.1s',
      }}
    >
      <div style={{ width: 3, borderRadius: 2, background: accentColor, flexShrink: 0, minHeight: 16 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <p style={{ fontSize: 14, fontWeight: 500, color: '#37352F' }}>{e.title}</p>
          {hasExtra && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#C4C4C0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          )}
        </div>
        <p style={{ fontSize: 12, color: '#9B9A97', marginTop: 2 }}>
          {e.startTime ? `${e.startTime}${e.endTime ? ` – ${e.endTime}` : ''}` : ' '}
        </p>
        {!expanded && (
          <p style={{ fontSize: 12, color: '#9B9A97', marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
            {e.location && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /><circle cx="12" cy="9" r="2.5" />
              </svg>
            )}
            {e.location || ' '}
          </p>
        )}
        {!expanded && e.memo && (
          <p style={{ fontSize: 12, color: '#9B9A97', marginTop: 3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
            {e.memo}
          </p>
        )}
        {expanded && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #EFEEEB', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {e.location && (
              <p style={{ fontSize: 12, color: '#9B9A97', display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /><circle cx="12" cy="9" r="2.5" />
                </svg>
                {e.location}
              </p>
            )}
            {e.memo && (
              <p style={{ fontSize: 13, color: '#37352F', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {e.memo}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({ message, done }: { message: string; done?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '16px 14px', borderRadius: 6,
      border: '1px dashed #E9E9E7', background: '#FAFAF8',
    }}>
      {done ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C4C4C0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C4C4C0" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="9" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      )}
      <p style={{ fontSize: 13, color: '#C4C4C0' }}>{message}</p>
    </div>
  )
}
