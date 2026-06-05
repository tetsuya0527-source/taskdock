'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { CalendarEvent, CalendarPeriod } from '@/types'
import EventModal from '@/components/EventModal'
import PeriodModal, { PERIOD_COLORS } from '@/components/PeriodModal'
import InlineAIChat from '@/components/InlineAIChat'

const COL_WIDTH = 88
const ROW_HEIGHT = 72
const MONTH_ROW_HEIGHT = 20
const HEADER_HEIGHT = 48
const PERIOD_ROW_HEIGHT = 26
const ROW_LABEL_WIDTH = 28
const DAYS_BEFORE = 90
const DAYS_AFTER = 180
const TOTAL_DAYS = DAYS_BEFORE + DAYS_AFTER + 1

const WEEKDAY_SHORT = ['日', '月', '火', '水', '木', '金', '土']

function getTodayStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getDateInfo(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return {
    weekday: WEEKDAY_SHORT[d.getDay()],
    dayNum: d.getDate(),
    isWeekend: d.getDay() === 0 || d.getDay() === 6,
    isSunday: d.getDay() === 0,
    isSaturday: d.getDay() === 6,
    isFirstOfMonth: d.getDate() === 1,
  }
}

export default function SchedulePage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [periods, setPeriods] = useState<CalendarPeriod[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [newCell, setNewCell] = useState<{ date: string; row: 1 | 2 | 3 | 4 } | null>(null)
  const [copiedEvent, setCopiedEvent] = useState<CalendarEvent | null>(null)
  const [periodModalOpen, setPeriodModalOpen] = useState(false)
  const [editingPeriod, setEditingPeriod] = useState<CalendarPeriod | null>(null)
  const [newPeriodDate, setNewPeriodDate] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const monthLabelRefs = useRef<(HTMLSpanElement | null)[]>([])
  const periodTextRefs = useRef<Map<string, HTMLSpanElement | null>>(new Map())
  const stickyDataRef = useRef<{
    months: { offset: number; width: number }[]
    periods: { id: string; left: number; width: number }[]
  }>({ months: [], periods: [] })
  const todayStr = getTodayStr()

  const dates: string[] = []
  for (let i = -DAYS_BEFORE; i <= DAYS_AFTER; i++) dates.push(addDays(todayStr, i))

  // Compute month spans for the month row
  const monthSpans: { label: string; count: number }[] = []
  {
    let i = 0
    while (i < dates.length) {
      const d = new Date(dates[i] + 'T00:00:00')
      const year = d.getFullYear()
      const month = d.getMonth()
      let j = i
      while (j < dates.length) {
        const dj = new Date(dates[j] + 'T00:00:00')
        if (dj.getFullYear() !== year || dj.getMonth() !== month) break
        j++
      }
      monthSpans.push({ label: `${year}年${month + 1}月`, count: j - i })
      i = j
    }
  }
  {
    let off = 0
    stickyDataRef.current.months = monthSpans.map(({ count }) => {
      const entry = { offset: off, width: count * COL_WIDTH }
      off += count * COL_WIDTH
      return entry
    })
  }

  const baseDate = new Date(dates[0] + 'T00:00:00')
  const lastDate = new Date(dates[TOTAL_DAYS - 1] + 'T00:00:00')

  // Expand repeating periods into individual instances for the visible range
  function expandPeriods(stored: typeof periods) {
    const result: Array<{ id: string; title: string; color: string; startDate: string; endDate: string; sourceId: string }> = []
    for (const p of stored) {
      if (!p.repeat) {
        result.push({ ...p, sourceId: p.id })
      } else {
        let year = baseDate.getFullYear()
        let month = baseDate.getMonth()
        while (new Date(year, month, 1) <= lastDate) {
          const daysInMonth = new Date(year, month + 1, 0).getDate()
          const sd = Math.min(p.repeat.startDay, daysInMonth)
          const ed = Math.min(p.repeat.endDay, daysInMonth)
          const mo = String(month + 1).padStart(2, '0')
          result.push({
            id: `${p.id}-${year}-${month}`,
            sourceId: p.id,
            title: p.title,
            color: p.color,
            startDate: `${year}-${mo}-${String(sd).padStart(2, '0')}`,
            endDate: `${year}-${mo}-${String(ed).padStart(2, '0')}`,
          })
          month++
          if (month > 11) { month = 0; year++ }
        }
      }
    }
    return result
  }

  const fetchData = useCallback(async () => {
    try {
      const [evRes, perRes] = await Promise.all([fetch('/api/events'), fetch('/api/periods')])
      const evData: CalendarEvent[] = await evRes.json()
      const perData: CalendarPeriod[] = await perRes.json()
      setEvents(evData)
      setPeriods(perData)
      const tagSet = new Set<string>()
      evData.forEach(e => e.tags.forEach(tag => tagSet.add(tag)))
      setAllTags(Array.from(tagSet))
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const scrollToToday = (smooth = false) => {
    if (scrollRef.current) {
      const left = DAYS_BEFORE * COL_WIDTH
      scrollRef.current.scrollTo({ left, behavior: smooth ? 'smooth' : 'instant' })
    }
  }

  useEffect(() => {
    if (!loading) scrollToToday(false)
  }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      const scroll = el.scrollLeft
      const viewW = el.clientWidth
      stickyDataRef.current.months.forEach(({ offset, width }, idx) => {
        const span = monthLabelRefs.current[idx]
        if (!span) return
        const lw = span.offsetWidth || 60
        const nat = (width - lw) / 2

        // Cell completely off screen — reset
        if (offset + width <= scroll || offset >= scroll + viewW) {
          span.style.transform = ''
          return
        }

        // Shift label to 4px from viewport left.
        // Negative shift allowed (when label is off-screen to the right),
        // but clamped so label never appears before the cell's left edge.
        const shift = Math.max(-nat, scroll - offset + 4 - nat)
        span.style.transform = Math.abs(shift) > 0.5 ? `translateX(${Math.round(shift)}px)` : ''
      })
      stickyDataRef.current.periods.forEach(({ id, left, width }) => {
        const span = periodTextRefs.current.get(id)
        if (!span) return
        const sw = span.offsetWidth || 80
        const over = scroll - left
        if (over > 0) {
          const shift = Math.max(0, Math.min(over - 3, width - sw - 14))
          span.style.transform = shift > 0 ? `translateX(${Math.round(shift)}px)` : ''
        } else {
          span.style.transform = ''
        }
      })
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps

  const openModal = (date: string, row: 1 | 2 | 3 | 4, existing?: CalendarEvent) => {
    setEditingEvent(existing || null)
    setNewCell(existing ? null : { date, row })
    setModalOpen(true)
  }

  const handleCopy = (event: CalendarEvent) => { setCopiedEvent(event) }

  const handlePaste = async (date: string) => {
    if (!copiedEvent) return
    const alreadyExists = events.some(e =>
      e.date === date &&
      e.title === copiedEvent.title &&
      e.startTime === copiedEvent.startTime &&
      e.endTime === copiedEvent.endTime
    )
    if (alreadyExists) { setCopiedEvent(null); return }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, repeatGroupId, createdAt, repeat, ...rest } = copiedEvent
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...rest, date }),
    })
    setCopiedEvent(null)
    fetchData()
  }

  const handleCellClick = (date: string, row: 1 | 2 | 3 | 4, existing?: CalendarEvent) => {
    if (copiedEvent) { handlePaste(date); return }
    openModal(date, row, existing)
  }

  const handleModalSubmit = async (data: Partial<CalendarEvent>, repeatMode?: 'single' | 'future' | 'all') => {
    if (editingEvent) {
      if (!editingEvent.repeatGroupId && data.repeat) {
        await fetch(`/api/events/${editingEvent.id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repeatMode: 'single' }),
        })
        await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
      } else {
        await fetch(`/api/events/${editingEvent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, repeatMode }),
        })
      }
    } else {
      await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    }
    setModalOpen(false); setEditingEvent(null); setNewCell(null)
    fetchData()
  }

  const handleDelete = async (id: string, repeatMode: 'single' | 'future') => {
    await fetch(`/api/events/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ repeatMode }) })
    fetchData()
  }

  const handleAddPeriod = (date: string) => {
    setEditingPeriod(null)
    setNewPeriodDate(date)
    setPeriodModalOpen(true)
  }

  const handleEditPeriod = (period: CalendarPeriod) => {
    setEditingPeriod(period)
    setNewPeriodDate('')
    setPeriodModalOpen(true)
  }

  const handlePeriodSubmit = async (data: Partial<CalendarPeriod>) => {
    if (editingPeriod) {
      await fetch(`/api/periods/${editingPeriod.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    } else {
      await fetch('/api/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    }
    setPeriodModalOpen(false); setEditingPeriod(null)
    fetchData()
  }

  const handlePeriodDelete = async (id: string) => {
    await fetch(`/api/periods/${id}`, { method: 'DELETE' })
    setPeriodModalOpen(false); setEditingPeriod(null)
    fetchData()
  }

  const multiDayEvents = events.filter(ev => ev.endDate && ev.endDate > ev.date)
  const singleDayEvents = events.filter(ev => !ev.endDate || ev.endDate <= ev.date)

  const eventMap: Record<string, Record<number, CalendarEvent>> = {}
  for (const ev of singleDayEvents) {
    if (!eventMap[ev.date]) eventMap[ev.date] = {}
    const evRows = ev.rows || [1]
    for (const r of evRows) eventMap[ev.date][r] = ev
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #E9E9E7', borderTopColor: '#37352F', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  const expandedPeriods = expandPeriods(periods)
  stickyDataRef.current.periods = expandedPeriods
    .filter(p => {
      const s = new Date(p.startDate + 'T00:00:00')
      const e = new Date(p.endDate + 'T00:00:00')
      return !(e < baseDate || s > lastDate)
    })
    .map(p => {
      const s = new Date(p.startDate + 'T00:00:00')
      const e = new Date(p.endDate + 'T00:00:00')
      const si = Math.max(0, Math.round((s.getTime() - baseDate.getTime()) / 86400000))
      const ei = Math.min(TOTAL_DAYS - 1, Math.round((e.getTime() - baseDate.getTime()) / 86400000))
      return { id: p.id, left: si * COL_WIDTH + 2, width: (ei - si + 1) * COL_WIDTH - 4 }
    })

  return (
    <div style={{ padding: '0 20px 96px' }}>
      {/* Header */}
      <div style={{ padding: '40px 0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1
          onClick={() => scrollToToday(true)}
          style={{ fontSize: 30, fontWeight: 700, color: '#37352F', letterSpacing: '-0.5px', cursor: 'pointer' }}
        >Schedule</h1>
        <button
          onClick={() => openModal(todayStr, 1)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '7px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600,
            background: '#37352F', color: '#FFFFFF',
            border: 'none', fontFamily: 'inherit', cursor: 'pointer',
            transition: 'background 0.1s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#1A1A1A')}
          onMouseLeave={e => (e.currentTarget.style.background = '#37352F')}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          追加
        </button>
      </div>

      <InlineAIChat onAdded={fetchData} />

      {/* Copy mode banner */}
      {copiedEvent && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px', marginBottom: 8,
          borderRadius: 6, background: '#EEF0FF', border: '1px solid #C8CEFF',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6E5ED2" strokeWidth="2" strokeLinecap="round">
              <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#6E5ED2' }}>
              「{copiedEvent.title}」をコピー中 — 貼り付けたい日付のセルをクリック
            </span>
          </div>
          <button
            onClick={() => setCopiedEvent(null)}
            style={{ fontSize: 11, fontWeight: 600, color: '#6E5ED2', background: 'transparent', border: 'none', fontFamily: 'inherit', cursor: 'pointer', padding: '2px 4px' }}
          >
            キャンセル
          </button>
        </div>
      )}

      {/* Calendar grid */}
      <div style={{
        borderRadius: 8,
        border: copiedEvent ? '2px solid #16A34A' : '1px solid #E9E9E7',
        overflow: 'hidden',
        background: '#FFFFFF',
        transition: 'border-color 0.15s',
      }}>
        <div style={{ display: 'flex', height: MONTH_ROW_HEIGHT + HEADER_HEIGHT + PERIOD_ROW_HEIGHT + 4 * ROW_HEIGHT }}>

          {/* Row labels */}
          <div style={{
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            width: ROW_LABEL_WIDTH,
            paddingTop: MONTH_ROW_HEIGHT + HEADER_HEIGHT + PERIOD_ROW_HEIGHT,
            background: '#F7F6F3',
            borderRight: '1px solid #E9E9E7',
          }}>
            {([1, 2, 3, 4] as const).map(row => (
              <div
                key={row}
                style={{
                  height: ROW_HEIGHT, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderBottom: row < 4 ? '1px solid #F0EFEC' : 'none',
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 500, color: '#C4C4C0' }}>{row}</span>
              </div>
            ))}
          </div>

          {/* Scrollable grid */}
          <div ref={scrollRef} style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', background: '#F7F6F3' }}>
            <div style={{ width: TOTAL_DAYS * COL_WIDTH, minWidth: TOTAL_DAYS * COL_WIDTH }}>

              {/* Month row */}
              <div style={{ display: 'flex', height: MONTH_ROW_HEIGHT, background: '#FAFAF8', borderBottom: '1px solid #F0EFEC' }}>
                {monthSpans.map(({ label, count }, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: count * COL_WIDTH,
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRight: '1px solid #D3D3CF',
                    }}
                  >
                    <span
                      ref={el => { monthLabelRefs.current[idx] = el }}
                      style={{ fontSize: 10, fontWeight: 600, color: '#9B9A97', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}
                    >
                      {label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Date headers */}
              <div style={{ display: 'flex', height: HEADER_HEIGHT, background: '#FFFFFF', borderBottom: '1px solid #F0EFEC' }}>
                {dates.map(date => {
                  const info = getDateInfo(date)
                  const isToday = date === todayStr
                  return (
                    <div
                      key={date}
                      style={{
                        width: COL_WIDTH, flexShrink: 0,
                        borderRight: `1px solid ${info.isFirstOfMonth ? '#D3D3CF' : '#F0EFEC'}`,
                        background: isToday ? '#F0F9F0' : 'transparent',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: 2,
                      }}
                    >
                      <span style={{
                        fontSize: 10,
                        color: isToday ? '#16A34A' : info.isSunday ? '#E03E3E' : info.isSaturday ? '#6E5ED2' : '#9B9A97',
                        fontWeight: 500,
                      }}>
                        {info.weekday}
                      </span>
                      <div style={{
                        width: 26, height: 26, borderRadius: '50%',
                        background: isToday ? '#16A34A' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span style={{
                          fontSize: 12, fontWeight: 600,
                          color: isToday ? '#FFFFFF' : info.isSunday ? '#E03E3E' : info.isSaturday ? '#6E5ED2' : '#37352F',
                        }}>
                          {info.dayNum}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Period row */}
              <div style={{ height: PERIOD_ROW_HEIGHT, position: 'relative', background: '#FFFFFF', borderBottom: '1px solid #E9E9E7' }}>
                {/* Background cells for empty-area clicks */}
                <div style={{ display: 'flex', height: '100%' }}>
                  {dates.map(date => {
                    const info = getDateInfo(date)
                    return (
                      <PeriodRowCell
                        key={date}
                        date={date}
                        isFirstOfMonth={info.isFirstOfMonth}
                        onAdd={handleAddPeriod}
                      />
                    )
                  })}
                </div>
                {/* Period overlays */}
                {expandedPeriods.map(period => {
                  const startD = new Date(period.startDate + 'T00:00:00')
                  const endD = new Date(period.endDate + 'T00:00:00')
                  if (endD < baseDate || startD > lastDate) return null
                  const startIdx = Math.max(0, Math.round((startD.getTime() - baseDate.getTime()) / 86400000))
                  const endIdx = Math.min(TOTAL_DAYS - 1, Math.round((endD.getTime() - baseDate.getTime()) / 86400000))
                  if (endIdx < startIdx) return null
                  const colorDef = PERIOD_COLORS.find(c => c.bg === period.color) ?? PERIOD_COLORS[0]
                  const sourcePeriod = periods.find(p => p.id === period.sourceId)
                  return (
                    <div
                      key={period.id}
                      onClick={() => sourcePeriod && handleEditPeriod(sourcePeriod)}
                      title={period.title}
                      style={{
                        position: 'absolute',
                        top: 3, bottom: 3,
                        left: startIdx * COL_WIDTH + 2,
                        width: (endIdx - startIdx + 1) * COL_WIDTH - 4,
                        background: period.color,
                        borderRadius: 4,
                        display: 'flex', alignItems: 'center',
                        padding: '0 7px',
                        fontSize: 11, fontWeight: 600,
                        color: colorDef.text,
                        overflow: 'hidden', whiteSpace: 'nowrap',
                        cursor: 'pointer', zIndex: 1,
                        transition: 'opacity 0.1s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                    >
                      <span ref={el => { if (el) periodTextRefs.current.set(period.id, el); else periodTextRefs.current.delete(period.id) }}>
                        {period.title}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Grid rows */}
              {([1, 2, 3, 4] as const).map(row => (
                <div key={row} style={{ display: 'flex', height: ROW_HEIGHT, position: 'relative' }}>
                  {dates.map(date => {
                    const info = getDateInfo(date)
                    const isToday = date === todayStr
                    const event = eventMap[date]?.[row]
                    return (
                      <GridCell
                        key={date}
                        date={date}
                        row={row}
                        isToday={isToday}
                        isWeekend={info.isWeekend}
                        isFirstOfMonth={info.isFirstOfMonth}
                        event={event}
                        onOpen={handleCellClick}
                        onCopy={handleCopy}
                        isPasteMode={!!copiedEvent}
                      />
                    )
                  })}
                  {/* Multi-day event overlays */}
                  {multiDayEvents
                    .filter(ev => (ev.rows || [1]).includes(row))
                    .map(ev => {
                      const startD = new Date(ev.date + 'T00:00:00')
                      const endD = new Date(ev.endDate! + 'T00:00:00')
                      if (endD < baseDate || startD > lastDate) return null
                      const startIdx = Math.max(0, Math.round((startD.getTime() - baseDate.getTime()) / 86400000))
                      const endIdx = Math.min(TOTAL_DAYS - 1, Math.round((endD.getTime() - baseDate.getTime()) / 86400000))
                      const c = ev.color || '#787774'
                      const evRows = ev.rows || [1]
                      const isFirstRow = evRows[0] === row
                      const isLastRow = evRows[evRows.length - 1] === row
                      const isMultiRow = evRows.length > 1
                      const topR = isFirstRow || !isMultiRow ? 5 : 0
                      const botR = isLastRow || !isMultiRow ? 5 : 0
                      return (
                        <div
                          key={ev.id}
                          onClick={() => openModal(ev.date, row, ev)}
                          title={ev.title}
                          style={{
                            position: 'absolute',
                            left: startIdx * COL_WIDTH + 3,
                            width: (endIdx - startIdx + 1) * COL_WIDTH - 6,
                            top: isFirstRow || !isMultiRow ? 3 : 0,
                            bottom: isLastRow || !isMultiRow ? 3 : 0,
                            background: c + '22',
                            borderTop: isFirstRow || !isMultiRow ? `1.5px solid ${c}` : 'none',
                            borderBottom: isLastRow || !isMultiRow ? `1.5px solid ${c}` : 'none',
                            borderLeft: `1.5px solid ${c}`,
                            borderRight: `1.5px solid ${c}`,
                            borderRadius: `${topR}px ${topR}px ${botR}px ${botR}px`,
                            display: 'flex', alignItems: 'flex-start',
                            overflow: 'hidden', cursor: 'pointer', zIndex: 2,
                            transition: 'opacity 0.1s',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
                          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                        >
                          {isFirstRow && (
                            <div style={{ padding: '4px 7px', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1, overflow: 'hidden' }}>
                              <span style={{ fontSize: 11, fontWeight: 600, color: c, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.3 }}>
                                {ev.title}
                              </span>
                              {(ev.startTime || ev.endTime) && (
                                <span style={{ fontSize: 10, color: c + 'AA', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                                  {ev.startTime}{ev.endTime ? `–${ev.endTime}` : ''}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                </div>
              ))}

            </div>
          </div>
        </div>
      </div>

      {modalOpen && (
        <EventModal
          event={editingEvent}
          defaultDate={newCell?.date}
          defaultRow={newCell?.row}
          allTags={allTags}
          onClose={() => { setModalOpen(false); setEditingEvent(null); setNewCell(null) }}
          onSubmit={handleModalSubmit}
          onDelete={handleDelete}
        />
      )}

      {periodModalOpen && (
        <PeriodModal
          period={editingPeriod}
          defaultStartDate={newPeriodDate}
          onClose={() => { setPeriodModalOpen(false); setEditingPeriod(null) }}
          onSubmit={handlePeriodSubmit}
          onDelete={handlePeriodDelete}
        />
      )}
    </div>
  )
}

function PeriodRowCell({ date, isFirstOfMonth, onAdd }: {
  date: string
  isFirstOfMonth: boolean
  onAdd: (date: string) => void
}) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onClick={() => onAdd(date)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: COL_WIDTH, flexShrink: 0, height: '100%',
        borderRight: `1px solid ${isFirstOfMonth ? '#D3D3CF' : '#F0EFEC'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        background: hov ? '#F7F6F3' : 'transparent',
        transition: 'background 0.1s',
      }}
    >
      {hov && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#C4C4C0" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      )}
    </div>
  )
}

function GridCell({
  date, row, isToday, isWeekend, isFirstOfMonth, event, onOpen, onCopy, isPasteMode, isCopiedSource,
}: {
  date: string
  row: 1 | 2 | 3 | 4
  isToday: boolean
  isWeekend: boolean
  isFirstOfMonth: boolean
  event?: CalendarEvent
  onOpen: (date: string, row: 1 | 2 | 3 | 4, event?: CalendarEvent) => void
  onCopy?: (event: CalendarEvent) => void
  isPasteMode?: boolean
  isCopiedSource?: boolean
}) {
  const [hov, setHov] = useState(false)

  const evRows = event?.rows || []
  const spansContinuesBelow = row < 4 && evRows.includes(row) && evRows.includes((row + 1) as 1 | 2 | 3 | 4)

  const getBg = () => {
    if (isCopiedSource) return '#EEF0FF'
    if (isPasteMode && hov && !event) return '#EEF0FF'
    if (hov && !event) return isToday ? '#E4F5E4' : '#EFEEEB'
    if (isToday) return '#F0F9F0'
    if (isWeekend) return '#FAF9F7'
    return '#FFFFFF'
  }

  return (
    <div
      onClick={() => onOpen(date, row, event)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: COL_WIDTH, flexShrink: 0,
        borderRight: `1px solid ${isFirstOfMonth ? '#D3D3CF' : '#F0EFEC'}`,
        borderBottom: row < 4 && !spansContinuesBelow ? '1px solid #F0EFEC' : 'none',
        background: getBg(),
        cursor: 'pointer', padding: 3,
        position: 'relative', transition: 'background 0.1s',
      }}
    >
      {event && (() => {
        const evRows = event.rows || [1]
        const isFirst = evRows[0] === row
        const isLast = evRows[evRows.length - 1] === row
        const isMulti = evRows.length > 1
        const topR = isFirst || !isMulti ? 5 : 0
        const botR = isLast || !isMulti ? 5 : 0
        const c = isCopiedSource ? '#6E5ED2' : (event.color || '#787774')
        const borderTop = isFirst || !isMulti ? `1.5px solid ${c}` : 'none'
        const borderBottom = isLast || !isMulti ? `1.5px solid ${c}` : 'none'
        return (
          <div
            style={{
              position: 'absolute',
              background: c + '22',
              borderTop, borderBottom,
              borderLeft: `1.5px solid ${c}`,
              borderRight: `1.5px solid ${c}`,
              top: isFirst || !isMulti ? 3 : 0,
              bottom: isLast || !isMulti ? 3 : 0,
              left: 3, right: 3,
              borderRadius: `${topR}px ${topR}px ${botR}px ${botR}px`,
              display: 'flex', alignItems: 'flex-start',
              overflow: 'hidden', transition: 'background 0.1s',
            }}
            title={event.title}
          >
            {isFirst && (
              <div style={{ padding: '4px 7px', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1, overflow: 'hidden' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: c, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.3 }}>
                  {event.title}
                </span>
                {(event.startTime || event.endTime) && (
                  <span style={{ fontSize: 10, color: c + 'AA', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                    {event.startTime}{event.endTime ? `–${event.endTime}` : ''}
                  </span>
                )}
              </div>
            )}
            {isFirst && hov && onCopy && !isPasteMode && (
              <button
                onClick={e => { e.stopPropagation(); onCopy(event) }}
                title="コピー"
                style={{
                  flexShrink: 0, marginRight: 4, padding: '3px', borderRadius: 4,
                  background: c + '22', border: 'none', color: c,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = c + '44')}
                onMouseLeave={e => (e.currentTarget.style.background = c + '22')}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              </button>
            )}
          </div>
        )
      })()}
    </div>
  )
}
