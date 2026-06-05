import { NextRequest, NextResponse } from 'next/server'
import { readData, writeData } from '@/lib/data'
import { CalendarPeriod } from '@/types'
import { v4 as uuidv4 } from 'uuid'

export async function GET() {
  const data = await readData()
  return NextResponse.json(data.periods)
}

export async function POST(req: NextRequest) {
  const data = await readData()
  const body = await req.json()
  const period: CalendarPeriod = {
    id: uuidv4(),
    title: body.title || '',
    startDate: body.startDate,
    endDate: body.endDate,
    color: body.color || '#FEF3C7',
  }
  data.periods.push(period)
  await writeData(data)
  return NextResponse.json(period, { status: 201 })
}
