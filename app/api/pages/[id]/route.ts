import { NextRequest, NextResponse } from 'next/server'
import { updatePage } from '@/lib/storage'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const page = updatePage(Number(id), body)

  if (!page) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 })
  }

  return NextResponse.json(page)
}
