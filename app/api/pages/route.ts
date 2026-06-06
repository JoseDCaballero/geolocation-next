import { NextResponse } from 'next/server'
import { getAllPages } from '@/lib/storage'

export const dynamic = 'force-dynamic'

export async function GET() {
  const pages = getAllPages()
  return NextResponse.json(pages)
}
