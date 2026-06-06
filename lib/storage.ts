import fs from 'fs'
import path from 'path'

export interface Page {
  id: number
  type: 'cover' | 'text' | 'image' | 'closing'
  title: string
  content: string
  image_path: string
  position: number
}

interface Store {
  pages: Page[]
  nextId: number
}

function getFilePath() {
  if (process.env.VERCEL) {
    return '/tmp/book-data.json'
  }
  return path.join(process.cwd(), 'book-data.json')
}

function seedData(): Store {
  const pages: Page[] = [
    { id: 1, type: 'cover', title: 'Mi Libro', content: 'Un libro de historias', image_path: '', position: 0 },
  ]

  let id = 2
  for (let i = 1; i <= 5; i++) {
    const textPos = (i - 1) * 2 + 1
    const imgPos = textPos + 1
    pages.push({ id: id++, type: 'text', title: `Página ${textPos}`, content: 'Escribe tu historia aquí...', image_path: '', position: textPos })
    pages.push({ id: id++, type: 'image', title: `Página ${imgPos}`, content: '', image_path: '', position: imgPos })
  }

  pages.push({ id: id++, type: 'closing', title: 'Fin', content: 'Gracias por leer', image_path: '', position: 11 })

  return { pages, nextId: id }
}

let store: Store | null = null

function load(): Store {
  if (store) return store
  try {
    const raw = fs.readFileSync(getFilePath(), 'utf-8')
    store = JSON.parse(raw)
  } catch {
    store = seedData()
    save()
  }
  return store!
}

function save() {
  try {
    fs.writeFileSync(getFilePath(), JSON.stringify(store, null, 2))
  } catch {}
}

export function getAllPages(): Page[] {
  return load().pages.sort((a, b) => a.position - b.position)
}

export function getPage(id: number): Page | undefined {
  return load().pages.find(p => p.id === id)
}

export function updatePage(
  id: number,
  data: { title?: string; content?: string; image_path?: string }
): Page | null {
  const s = load()
  const idx = s.pages.findIndex(p => p.id === id)
  if (idx === -1) return null

  if (data.title !== undefined) s.pages[idx].title = data.title
  if (data.content !== undefined) s.pages[idx].content = data.content
  if (data.image_path !== undefined) s.pages[idx].image_path = data.image_path

  save()
  return s.pages[idx]
}

export function deleteImage(filename: string): boolean {
  const s = load()
  let changed = false
  for (const page of s.pages) {
    if (page.image_path === `/api/files/${filename}` || page.image_path === `/uploads/${filename}`) {
      page.image_path = ''
      changed = true
    }
  }
  if (changed) save()
  return changed
}
