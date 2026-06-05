import { NextRequest, NextResponse } from 'next/server'
import { readData, writeData } from '@/lib/data'
import { Task, RepeatConfig } from '@/types'
import { v4 as uuidv4 } from 'uuid'

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function generateRepeatingTasks(task: Task, repeat: RepeatConfig): Task[] {
  const tasks: Task[] = []
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const endDate = repeat.endDate ? new Date(repeat.endDate + 'T00:00:00') : null
  const groupId = uuidv4()
  const maxOccurrences = 365

  let start = task.deadline ? new Date(task.deadline + 'T00:00:00') : new Date(today)

  if (repeat.type === 'weekly' && repeat.weekday !== undefined) {
    const diff = (repeat.weekday - start.getDay() + 7) % 7
    start.setDate(start.getDate() + diff)
  }

  let current = new Date(start)
  let count = 0

  while (count < maxOccurrences) {
    if (endDate && current > endDate) break

    const newTask: Task = {
      ...task,
      id: count === 0 ? task.id : uuidv4(),
      deadline: toDateStr(current),
      repeatGroupId: groupId,
    }
    tasks.push(newTask)

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

  return tasks
}

export async function GET() {
  const data = await readData()
  return NextResponse.json(data.tasks)
}

export async function POST(req: NextRequest) {
  const data = await readData()
  const body = await req.json()

  const newTask: Task = {
    id: uuidv4(),
    title: body.title || '',
    deadline: body.deadline || null,
    deadlineTime: body.deadlineTime || undefined,
    priority: body.priority || 'medium',
    completed: false,
    memo: body.memo || '',
    repeat: body.repeat || null,
    tags: body.tags || [],
    linkedEventIds: body.linkedEventIds || [],
    createdAt: new Date().toISOString(),
    repeatGroupId: body.repeatGroupId,
    timelineDate: body.timelineDate || null,
    timelineOrder: body.timelineOrder || null,
  }

  if (body.tags) {
    for (const tag of body.tags) {
      if (!data.taskTags.includes(tag)) {
        data.taskTags.push(tag)
      }
    }
  }

  if (newTask.repeat) {
    const repeatingTasks = generateRepeatingTasks(newTask, newTask.repeat)
    data.tasks.push(...repeatingTasks)
  } else {
    data.tasks.push(newTask)
  }

  await writeData(data)
  return NextResponse.json(newTask, { status: 201 })
}
