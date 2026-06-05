import { NextRequest, NextResponse } from 'next/server'
import { readData, writeData } from '@/lib/data'
import { CalendarEvent, RepeatConfig } from '@/types'
import { v4 as uuidv4 } from 'uuid'

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function generateRepeatingEvents(event: CalendarEvent, repeat: RepeatConfig): CalendarEvent[] {
  const events: CalendarEvent[] = []
  const startDate = new Date(event.date + 'T00:00:00')
  const endDate = repeat.endDate ? new Date(repeat.endDate + 'T00:00:00') : null
  const groupId = uuidv4()
  const maxOccurrences = 365

  if (repeat.type === 'weekly' && repeat.weekday !== undefined) {
    const diff = (repeat.weekday - startDate.getDay() + 7) % 7
    startDate.setDate(startDate.getDate() + diff)
  }

  let current = new Date(startDate)
  let count = 0

  while (count < maxOccurrences) {
    if (endDate && current > endDate) break

    const newEvent: CalendarEvent = {
      ...event,
      id: count === 0 ? event.id : uuidv4(),
      date: toLocalDateStr(current),
      repeatGroupId: groupId,
    }
    events.push(newEvent)

    count++
    if (count >= maxOccurrences) break

    const next = new Date(current)
    switch (repeat.type) {
      case 'daily':
        next.setDate(next.getDate() + repeat.interval)
        break
      case 'weekly':
        next.setDate(next.getDate() + 7 * repeat.interval)
        break
      case 'monthly':
        next.setMonth(next.getMonth() + repeat.interval)
        break
      case 'yearly':
        next.setFullYear(next.getFullYear() + repeat.interval)
        break
    }
    current = next
  }

  return events
}

function migrateEvent(e: CalendarEvent & { row?: number }): CalendarEvent {
  if (!e.rows) {
    e.rows = [((e.row || 1) as 1 | 2 | 3 | 4)]
  }
  return e
}

export async function GET() {
  const data = await readData()
  return NextResponse.json(data.events.map(migrateEvent))
}

const TAG_COLOR_PALETTE = [
  '#337EA9', '#448361', '#9065B0', '#D9730D',
  '#C14C8A', '#D44C47', '#CB912F', '#9F6B53', '#787774',
]

export async function POST(req: NextRequest) {
  const data = await readData()
  const body = await req.json()

  const tagColors = data.eventTagColors ?? {}
  for (const tag of (body.tags ?? [])) {
    if (!tagColors[tag]) {
      const used = Object.values(tagColors)
      tagColors[tag] = TAG_COLOR_PALETTE.find(c => !used.includes(c))
        ?? TAG_COLOR_PALETTE[Object.keys(tagColors).length % TAG_COLOR_PALETTE.length]
    }
  }
  data.eventTagColors = tagColors

  const autoColor = (body.tags ?? []).map((t: string) => tagColors[t]).find(Boolean)

  const newEvent: CalendarEvent = {
    id: uuidv4(),
    title: body.title || '',
    date: body.date || toLocalDateStr(new Date()),
    startTime: body.startTime || '',
    endTime: body.endTime || '',
    location: body.location || '',
    memo: body.memo || '',
    repeat: body.repeat || null,
    tags: body.tags || [],
    linkedTaskIds: body.linkedTaskIds || [],
    rows: body.rows?.length ? body.rows : [body.row || 1],
    createdAt: new Date().toISOString(),
    repeatGroupId: body.repeatGroupId,
    color: body.color || autoColor || undefined,
  }

  if (body.tags) {
    for (const tag of body.tags) {
      if (!data.eventTags.includes(tag)) {
        data.eventTags.push(tag)
      }
    }
  }

  if (newEvent.repeat) {
    const repeatingEvents = generateRepeatingEvents(newEvent, newEvent.repeat)
    data.events.push(...repeatingEvents)
  } else {
    data.events.push(newEvent)
  }

  await writeData(data)
  return NextResponse.json(newEvent, { status: 201 })
}
