import { NextRequest, NextResponse } from 'next/server'
import { readData, writeData } from '@/lib/data'

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const data = await readData()
  const body = await req.json()
  const idx = data.periods.findIndex(p => p.id === params.id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  data.periods[idx] = { ...data.periods[idx], ...body }
  await writeData(data)
  return NextResponse.json({ success: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const data = await readData()
  data.periods = data.periods.filter(p => p.id !== params.id)
  await writeData(data)
  return NextResponse.json({ success: true })
}
