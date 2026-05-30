import { NextRequest, NextResponse } from 'next/server'
import { writeFile, unlink } from 'node:fs/promises'
import path from 'path'
import { deleteImage } from '@/lib/db'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const oldFilename = formData.get('oldFilename') as string | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() || 'jpg'
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())
  const filepath = path.join(process.cwd(), 'public', 'uploads', filename)

  await writeFile(filepath, buffer)

  if (oldFilename) {
    const oldPath = path.join(process.cwd(), 'public', 'uploads', oldFilename)
    try {
      await unlink(oldPath)
      deleteImage(oldFilename)
    } catch {}
  }

  return NextResponse.json({ url: `/uploads/${filename}` })
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const filename = searchParams.get('filename')

  if (!filename) {
    return NextResponse.json({ error: 'No filename provided' }, { status: 400 })
  }

  const filepath = path.join(process.cwd(), 'public', 'uploads', filename)
  try {
    await unlink(filepath)
    deleteImage(filename)
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
