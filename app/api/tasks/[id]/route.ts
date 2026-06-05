import { NextRequest, NextResponse } from 'next/server'
import { readData, writeData } from '@/lib/data'

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const data = await readData()
  const { repeatMode, ...body } = await req.json()
  const task = data.tasks.find((t) => t.id === params.id)
  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  if (repeatMode === 'future' && task.repeatGroupId) {
    const deadline = task.deadline || ''
    data.tasks = data.tasks.map((t) => {
      if (t.repeatGroupId !== task.repeatGroupId) return t
      if (t.deadline && t.deadline < deadline) return t
      return { ...t, ...body }
    })
  } else if (repeatMode === 'all' && task.repeatGroupId) {
    data.tasks = data.tasks.map((t) =>
      t.repeatGroupId === task.repeatGroupId ? { ...t, ...body } : t
    )
  } else {
    const idx = data.tasks.findIndex((t) => t.id === params.id)
    data.tasks[idx] = { ...data.tasks[idx], ...body }
  }

  if (body.tags) {
    for (const tag of body.tags) {
      if (!data.taskTags.includes(tag)) data.taskTags.push(tag)
    }
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

  const task = data.tasks.find((t) => t.id === params.id)
  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  if (repeatMode === 'future' && task.repeatGroupId) {
    const deadline = task.deadline || ''
    data.tasks = data.tasks.filter((t) => {
      if (t.repeatGroupId !== task.repeatGroupId) return true
      if (!t.deadline) return false
      return t.deadline < deadline
    })
  } else {
    data.tasks = data.tasks.filter((t) => t.id !== params.id)
  }

  await writeData(data)
  return NextResponse.json({ success: true })
}
