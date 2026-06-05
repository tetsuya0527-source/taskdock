import { NextRequest, NextResponse } from 'next/server'
import { readData, writeData } from '@/lib/data'

const TAG_COLOR_PALETTE = [
  '#337EA9', '#448361', '#9065B0', '#D9730D',
  '#C14C8A', '#D44C47', '#CB912F', '#9F6B53', '#787774',
]

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const data = await readData()
  const { repeatMode, ...body } = await req.json()
  const event = data.events.find((e) => e.id === params.id)
  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  if (repeatMode === 'future' && event.repeatGroupId) {
    const date = event.date
    data.events = data.events.map((e) => {
      if (e.repeatGroupId !== event.repeatGroupId) return e
      if (e.date < date) return e
      return { ...e, ...body, date: e.date }
    })
  } else if (repeatMode === 'all' && event.repeatGroupId) {
    data.events = data.events.map((e) =>
      e.repeatGroupId === event.repeatGroupId ? { ...e, ...body, date: e.date } : e
    )
  } else {
    const idx = data.events.findIndex((e) => e.id === params.id)
    data.events[idx] = { ...data.events[idx], ...body }
  }

  if (body.tags) {
    const tagColors = data.eventTagColors ?? {}
    for (const tag of body.tags) {
      if (!data.eventTags.includes(tag)) data.eventTags.push(tag)
      if (!tagColors[tag]) {
        const used = Object.values(tagColors)
        tagColors[tag] = TAG_COLOR_PALETTE.find(c => !used.includes(c))
          ?? TAG_COLOR_PALETTE[Object.keys(tagColors).length % TAG_COLOR_PALETTE.length]
      }
    }
    data.eventTagColors = tagColors
  }

  await writeData(data)
  return NextResponse.json({ success: true })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const data = await readData()
  const body = await req.json().catch(() => ({}))
  const repeatMode: 'single' | 'future' = body.repeatMode || 'single'

  const event = data.events.find((e) => e.id === params.id)
  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  if (repeatMode === 'future' && event.repeatGroupId) {
    const date = event.date
    data.events = data.events.filter((e) => {
      if (e.repeatGroupId !== event.repeatGroupId) return true
      return e.date < date
    })
  } else {
    data.events = data.events.filter((e) => e.id !== params.id)
  }

  await writeData(data)
  return NextResponse.json({ success: true })
}
