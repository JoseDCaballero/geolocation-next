import Database from 'better-sqlite3'
import path from 'path'

const dbPath = path.join(process.cwd(), 'book.sqlite')

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    initDb()
  }
  return db
}

function initDb() {
  db!.exec(`
    CREATE TABLE IF NOT EXISTS pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL DEFAULT 'text',
      title TEXT DEFAULT '',
      content TEXT DEFAULT '',
      image_path TEXT DEFAULT '',
      position INTEGER NOT NULL UNIQUE
    )
  `)

  const count = db!.prepare('SELECT COUNT(*) as c FROM pages').get() as { c: number }
  if (count.c === 0) {
    seedDb()
  }
}

function seedDb() {
  const insert = db!.prepare(
    'INSERT INTO pages (type, title, content, image_path, position) VALUES (?, ?, ?, ?, ?)'
  )

  const tx = db!.transaction(() => {
    insert.run('cover', 'Mi Libro', 'Un libro de historias', '', 0)
    for (let i = 1; i <= 5; i++) {
      const textPos = (i - 1) * 2 + 1
      const imgPos = textPos + 1
      insert.run('text', `Página ${textPos}`, 'Escribe tu historia aquí...', '', textPos)
      insert.run('image', `Página ${imgPos}`, '', '', imgPos)
    }
    insert.run('closing', 'Fin', 'Gracias por leer', '', 11)
  })

  tx()
}

export interface Page {
  id: number
  type: 'cover' | 'text' | 'image' | 'closing'
  title: string
  content: string
  image_path: string
  position: number
}

export function getAllPages(): Page[] {
  const db = getDb()
  return db
    .prepare('SELECT * FROM pages ORDER BY position ASC')
    .all() as Page[]
}

export function getPage(id: number): Page | undefined {
  const db = getDb()
  return db.prepare('SELECT * FROM pages WHERE id = ?').get(id) as Page | undefined
}

export function updatePage(
  id: number,
  data: { title?: string; content?: string; image_path?: string }
): Page | null {
  const db = getDb()
  const fields: string[] = []
  const values: (string | number | boolean)[] = []

  if (data.title !== undefined) {
    fields.push('title = ?')
    values.push(data.title)
  }
  if (data.content !== undefined) {
    fields.push('content = ?')
    values.push(data.content)
  }
  if (data.image_path !== undefined) {
    fields.push('image_path = ?')
    values.push(data.image_path)
  }

  if (fields.length === 0) return null

  values.push(id)
  db.prepare(`UPDATE pages SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  return getPage(id) || null
}

export function deleteImage(filename: string): boolean {
  const db = getDb()
  const result = db
    .prepare(
      'UPDATE pages SET image_path = ? WHERE image_path = ?'
    )
    .run('', `/uploads/${filename}`)
  return result.changes > 0
}
