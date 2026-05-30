'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'

interface Page {
  id: number
  type: 'cover' | 'text' | 'image' | 'closing'
  title: string
  content: string
  image_path: string
  position: number
}

export default function Book() {
  const [pages, setPages] = useState<Page[]>([])
  const [currentIdx, setCurrentIdx] = useState(-1)
  const [flip, setFlip] = useState<'idle' | 'forward' | 'backward'>('idle')
  const [editing, setEditing] = useState<{ id: number; field: 'title' | 'content' } | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/pages')
      .then(r => r.json())
      .then(setPages)
      .catch(console.error)
  }, [])

  const contentPages = pages.slice(1, -1)
  const contentCount = contentPages.length
  const currentPage = currentIdx >= 0 && currentIdx < contentCount ? contentPages[currentIdx] : null

  const goTo = (idx: number) => {
    if (idx < -1 || idx >= contentCount || flip !== 'idle') return
    if (currentIdx === -1) {
      setCurrentIdx(idx)
      setEditing(null)
      return
    }
    if (idx === -1) {
      setFlip('forward')
      setTimeout(() => {
        setCurrentIdx(-1)
        setFlip('idle')
        setEditing(null)
      }, 500)
      return
    }
    const dir = idx > currentIdx ? 'forward' : 'backward'
    setFlip(dir)
    setTimeout(() => {
      setCurrentIdx(idx)
      setFlip('idle')
      setEditing(null)
    }, 500)
  }

  const goNext = () => {
    if (currentIdx >= contentCount - 1) {
      goTo(-1)
    } else {
      goTo(currentIdx + 1)
    }
  }

  const goPrev = () => {
    if (currentIdx <= 0) {
      goTo(-1)
    } else {
      goTo(currentIdx - 1)
    }
  }

  const updatePage = async (id: number, data: { title?: string; content?: string; image_path?: string }) => {
    try {
      const res = await fetch(`/api/pages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        const updated = await res.json()
        setPages(prev => prev.map(p => p.id === id ? updated : p))
      }
    } catch {}
  }

  const saveEdit = (id: number, field: 'title' | 'content', value: string) => {
    updatePage(id, { [field]: value })
    setEditing(null)
  }

  const handleUpload = async (pageId: number, file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const current = pages.find(p => p.id === pageId)
      if (current?.image_path) {
        const parts = current.image_path.split('/')
        formData.append('oldFilename', parts[parts.length - 1])
      }
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (res.ok) {
        const { url } = await res.json()
        await updatePage(pageId, { image_path: url })
      }
    } catch {}
    setUploading(false)
  }

  const removeImage = async (pageId: number) => {
    const page = pages.find(p => p.id === pageId)
    if (!page?.image_path) return
    const parts = page.image_path.split('/')
    const filename = parts[parts.length - 1]
    await fetch(`/api/upload?filename=${filename}`, { method: 'DELETE' })
    await updatePage(pageId, { image_path: '' })
  }

  if (pages.length === 0) {
    return (
      <div className="book-loader">
        <div className="book-loader-spinner" />
      </div>
    )
  }

  if (currentIdx === -1) {
    const cover = pages[0]
    return (
      <div className="reader">
        <div className="cover-page">
          <div className="cover-content">
            {cover && (
              <>
                {editing?.id === cover.id && editing.field === 'title' ? (
                  <input
                    className="cover-title-input"
                    value={cover.title}
                    onChange={e => {
                      const updated = { ...cover, title: e.target.value }
                      setPages(prev => prev.map(p => p.id === cover.id ? updated : p))
                    }}
                    onBlur={() => saveEdit(cover.id, 'title', cover.title)}
                    onKeyDown={e => e.key === 'Enter' && saveEdit(cover.id, 'title', cover.title)}
                    autoFocus
                  />
                ) : (
                  <h1 className="cover-title" onClick={() => setEditing({ id: cover.id, field: 'title' })}>
                    {cover.title || 'Nuestra Historia'}
                  </h1>
                )}
                <p className="cover-sub">{cover.content || 'Un libro de historias'}</p>
              </>
            )}
            <button className="btn-open" onClick={goNext}>Abrir libro →</button>
          </div>
          <div className="cover-decoration">
            <div className="cover-circle" />
            <div className="cover-circle c2" />
            <div className="cover-circle c3" />
          </div>
        </div>
      </div>
    )
  }

  const isText = currentPage?.type === 'text'
  const isImage = currentPage?.type === 'image'
  const flipClass = flip !== 'idle' ? `flip-${flip}` : ''

  return (
    <div className="reader">
      <div className={`book-spread ${flipClass}`}>
        <div className="page-shadow" />

        <div className="page-side left-side">
          <div className="page-number-inner">{currentIdx + 1}</div>
        </div>

        <div className="book-spine" />

        <div className="page-side right-side">
          <div className="page-inner">
            {editing && <div className="edit-overlay" onClick={() => setEditing(null)} />}

            <div className="page-content-area">
              <div className="page-header-line">
                <span className="page-number-label">{currentIdx + 1} / {contentCount}</span>
              </div>

              {isText && (
                <div className="text-page">
                  {editing?.id === currentPage!.id && editing.field === 'title' ? (
                    <input
                      className="page-title-input"
                      value={currentPage!.title}
                      onChange={e => {
                        const updated = { ...currentPage!, title: e.target.value }
                        setPages(prev => prev.map(p => p.id === currentPage!.id ? updated : p))
                      }}
                      onBlur={() => saveEdit(currentPage!.id, 'title', currentPage!.title)}
                      onKeyDown={e => e.key === 'Enter' && saveEdit(currentPage!.id, 'title', currentPage!.title)}
                      autoFocus
                    />
                  ) : (
                    <h2 className="page-title" onClick={() => setEditing({ id: currentPage!.id, field: 'title' })}>
                      {currentPage!.title || 'Sin título'}
                      <span className="edit-icon">✏️</span>
                    </h2>
                  )}

                  {editing?.id === currentPage!.id && editing.field === 'content' ? (
                    <textarea
                      className="page-textarea"
                      value={currentPage!.content}
                      onChange={e => {
                        const updated = { ...currentPage!, content: e.target.value }
                        setPages(prev => prev.map(p => p.id === currentPage!.id ? updated : p))
                      }}
                      onBlur={() => saveEdit(currentPage!.id, 'content', currentPage!.content)}
                      autoFocus
                    />
                  ) : (
                    <p className="page-paragraph" onClick={() => setEditing({ id: currentPage!.id, field: 'content' })}>
                      {currentPage!.content || 'Escribe tu historia aquí...'}
                      <span className="edit-icon">✏️</span>
                    </p>
                  )}
                </div>
              )}

              {isImage && (
                <div className="image-page">
                  {editing?.id === currentPage!.id && editing.field === 'title' ? (
                    <input
                      className="page-title-input"
                      value={currentPage!.title}
                      onChange={e => {
                        const updated = { ...currentPage!, title: e.target.value }
                        setPages(prev => prev.map(p => p.id === currentPage!.id ? updated : p))
                      }}
                      onBlur={() => saveEdit(currentPage!.id, 'title', currentPage!.title)}
                      onKeyDown={e => e.key === 'Enter' && saveEdit(currentPage!.id, 'title', currentPage!.title)}
                      autoFocus
                    />
                  ) : (
                    <h2 className="page-title" onClick={() => setEditing({ id: currentPage!.id, field: 'title' })}>
                      {currentPage!.title || 'Imagen'}
                      <span className="edit-icon">✏️</span>
                    </h2>
                  )}

                  <div className="image-area">
                    {currentPage!.image_path ? (
                      <div className="image-wrapper">
                        <Image
                          src={currentPage!.image_path}
                          alt={currentPage!.title || 'Imagen'}
                          fill
                          className="page-image"
                          sizes="(max-width: 768px) 100vw, 500px"
                        />
                        <button className="image-remove" onClick={() => removeImage(currentPage!.id)} title="Eliminar">✕</button>
                      </div>
                    ) : (
                      <div className="image-placeholder" onClick={() => fileRef.current?.click()}>
                        {uploading ? (
                          <span>Subiendo...</span>
                        ) : (
                          <><span className="upload-icon">📷</span><span>Haz clic para subir una imagen</span></>
                        )}
                      </div>
                    )}
                    <input ref={fileRef} type="file" accept="image/*" className="file-input"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(currentPage!.id, f); e.target.value = '' }} />
                    {currentPage!.image_path && (
                      <button className="btn-change-image" onClick={() => fileRef.current?.click()}>Cambiar imagen</button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="page-footer-line">
              <button className="btn-nav" onClick={goPrev} disabled={flip !== 'idle'}>
                {currentIdx === 0 ? '← Cubierta' : '← Anterior'}
              </button>

              <div className="page-dots">
                {contentPages.map((_, i) => (
                  <span key={i} className={`dot ${i === currentIdx ? 'dot-active' : ''}`} onClick={() => goTo(i)} />
                ))}
              </div>

              <button className="btn-nav btn-nav-next" onClick={goNext} disabled={flip !== 'idle'}>
                {currentIdx >= contentCount - 1 ? 'Cerrar' : 'Siguiente →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
