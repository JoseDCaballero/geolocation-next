import { NextResponse } from 'next/server'
import { getAllPages } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const pages = getAllPages()
  return NextResponse.json(pages)
}
