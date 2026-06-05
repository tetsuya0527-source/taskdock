import { NextRequest, NextResponse } from 'next/server'
import { readData, writeData } from '@/lib/data'

export async function GET() {
  const data = await readData()
  return NextResponse.json(data.eventTagColors ?? {})
}

export async function PUT(req: NextRequest) {
  const data = await readData()
  const body = await req.json()
  data.eventTagColors = { ...data.eventTagColors, ...body }
  await writeData(data)
  return NextResponse.json(data.eventTagColors)
}
