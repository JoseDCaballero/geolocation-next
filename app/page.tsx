'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { getSocket } from '@/lib/socket'

export default function Home() {
  const router = useRouter()
  const [name, setName] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('geotrack_name') || ''
    }
    return ''
  })
  const [createPassword, setCreatePassword] = useState('')
  const [joinRoomId, setJoinRoomId] = useState('')
  const [joinPassword, setJoinPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [createdRoom, setCreatedRoom] = useState('')

  useEffect(() => {
    const socket = getSocket()

    socket.on('room-created', ({ roomId }) => {
      setCreatedRoom(roomId)
      setLoading(false)
    })

    socket.on('room-joined', ({ roomId }) => {
      setLoading(false)
      router.push(`/room/${roomId}`)
    })

    socket.on('error', ({ message }) => {
      setError(message)
      setLoading(false)
    })

    return () => {
      socket.off('room-created')
      socket.off('room-joined')
      socket.off('error')
    }
  }, [router])

  const handleCreate = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('Ingresa tu nombre'); return }
    setError('')
    setLoading(true)
    localStorage.setItem('geotrack_name', name.trim())

    const socket = getSocket()
    socket.emit('create-room', {
      password: createPassword.trim() || undefined,
    })
  }

  const handleJoin = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('Ingresa tu nombre'); return }
    if (!joinRoomId.trim()) { setError('Ingresa el código de sala'); return }
    setError('')
    setLoading(true)
    localStorage.setItem('geotrack_name', name.trim())

    const socket = getSocket()
    socket.emit('join-room', {
      roomId: joinRoomId.trim().toUpperCase(),
      password: joinPassword.trim() || undefined,
      name: name.trim(),
    })
  }

  const copyRoomCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      // fallback
    }
  }

  return (
    <div className="home-container">
      <div style={{ textAlign: 'center' }}>
        <h1 className="home-title">GeoTrack</h1>
        <p className="home-subtitle">
          Comparte tu ubicación en tiempo real con quien quieras
        </p>
      </div>

      <div style={{ width: '100%', maxWidth: 600 }}>
        <input
          className="input"
          placeholder="Tu nombre"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={20}
        />
      </div>

      {error && <div className="error-msg">{error}</div>}

      {createdRoom ? (
        <div className="card" style={{ maxWidth: 400, textAlign: 'center' }}>
          <h2>Sala creada</h2>
          <p>Comparte este código con quien quieras que se una:</p>
          <div
            style={{
              fontSize: '2rem',
              fontWeight: 700,
              letterSpacing: '0.2em',
              fontFamily: 'monospace',
              cursor: 'pointer',
              padding: '0.5rem',
              background: 'rgba(108,99,255,0.1)',
              borderRadius: '0.5rem',
            }}
            onClick={() => copyRoomCode(createdRoom)}
            title="Copiar código"
          >
            {createdRoom}
          </div>
          <p style={{ fontSize: '0.75rem', color: '#8888aa' }}>
            Haz clic en el código para copiarlo
          </p>
          <button
            className="btn btn-primary"
            onClick={() => {
              const socket = getSocket()
              socket.emit('join-room', {
                roomId: createdRoom,
                password: createPassword.trim() || undefined,
                name: name.trim(),
              })
              setLoading(true)
            }}
          >
            Entrar a la sala
          </button>
        </div>
      ) : (
        <div className="card-grid">
          <form className="card" onSubmit={handleCreate}>
            <h2>Crear sala</h2>
            <p>Crea una sala y comparte el código</p>
            <input
              className="input"
              type="password"
              placeholder="Contraseña (opcional)"
              value={createPassword}
              onChange={e => setCreatePassword(e.target.value)}
            />
            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Creando...' : 'Crear sala'}
            </button>
          </form>

          <form className="card" onSubmit={handleJoin}>
            <h2>Unirse a sala</h2>
            <p>Ingresa el código de la sala</p>
            <input
              className="input"
              placeholder="Código de sala"
              value={joinRoomId}
              onChange={e => setJoinRoomId(e.target.value.toUpperCase())}
              maxLength={6}
              style={{ textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: '0.1em' }}
            />
            <input
              className="input"
              type="password"
              placeholder="Contraseña (si tiene)"
              value={joinPassword}
              onChange={e => setJoinPassword(e.target.value)}
            />
            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Uniéndose...' : 'Unirse'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
