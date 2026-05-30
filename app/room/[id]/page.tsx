'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { getSocket, disconnectSocket } from '@/lib/socket'
import type { Position } from '@/lib/types'
import type { Socket } from 'socket.io-client'

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
})

interface UserMarker {
  id: string
  color: string
  name: string
  position?: { lat: number; lng: number }
  trail: Position[]
}

export default function RoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.id as string

  const socketRef = useRef<Socket | null>(null)
  const watchIdRef = useRef<number | null>(null)

  const [users, setUsers] = useState<Map<string, UserMarker>>(new Map())
  const [myColor, setMyColor] = useState('#6c63ff')
  const [myId, setMyId] = useState('')
  const [connected, setConnected] = useState(false)
  const [geoError, setGeoError] = useState('')
  const [myPosition, setMyPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [followingUserId, setFollowingUserId] = useState<string>('self')
  const followingUserIdRef = useRef<string>('self')

  const setFollow = useCallback((id: string) => {
    followingUserIdRef.current = id
    setFollowingUserId(id)
  }, [])

  const startGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError('Tu navegador no soporta geolocalización')
      return
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setMyPosition({ lat: latitude, lng: longitude })
        const socket = socketRef.current
        if (socket?.connected) {
          socket.emit('update-position', { lat: latitude, lng: longitude })
        }
      },
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setGeoError('Permiso de ubicación denegado')
            break
          case err.POSITION_UNAVAILABLE:
            setGeoError('Ubicación no disponible')
            break
          case err.TIMEOUT:
            setGeoError('Tiempo de espera agotado')
            break
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      },
    )
  }, [])

  const stopGeolocation = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }, [])

  useEffect(() => {
    const socket = getSocket()
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
    })

    socket.on('disconnect', () => {
      setConnected(false)
    })

    socket.on('room-joined', (data) => {
      setMyId(data.userId)
      setMyColor(data.color)
      setConnected(true)

      const userMap = new Map<string, UserMarker>()
      data.users.forEach(u => {
        userMap.set(u.id, {
          id: u.id,
          color: u.color,
          name: u.name,
          position: u.position,
          trail: [],
        })
      })
      data.trails.forEach(t => {
        const user = userMap.get(t.userId)
        if (user) user.trail = t.trail
      })

      setUsers(userMap)
      startGeolocation()
    })

    socket.on('user-joined', (data) => {
      setUsers(prev => {
        const next = new Map(prev)
        next.set(data.id, {
          id: data.id,
          color: data.color,
          name: data.name,
          trail: [],
        })
        return next
      })
    })

    socket.on('user-left', (data) => {
      setUsers(prev => {
        const next = new Map(prev)
        next.delete(data.userId)
        const current = followingUserIdRef.current
        if (current === data.userId) {
          setFollow('self')
        }
        return next
      })
    })

    socket.on('user-moved', (data) => {
      setUsers(prev => {
        const next = new Map(prev)
        const user = next.get(data.userId)
        if (user) {
          user.position = { lat: data.lat, lng: data.lng }
          user.trail.push({ lat: data.lat, lng: data.lng, timestamp: Date.now() })
          if (user.trail.length > 500) {
            user.trail = user.trail.slice(-500)
          }
        }
        return new Map(next)
      })
    })

    const savedName = localStorage.getItem('geotrack_name') || 'Usuario'

    socket.emit('join-room', {
      roomId,
      name: savedName,
    })

    return () => {
      stopGeolocation()
      socket.off('connect')
      socket.off('disconnect')
      socket.off('room-joined')
      socket.off('user-joined')
      socket.off('user-left')
      socket.off('user-moved')
    }
  }, [roomId, startGeolocation, stopGeolocation, setFollow])

  const leaveRoom = () => {
    stopGeolocation()
    disconnectSocket()
    router.push('/')
  }

  const toggleFollow = () => {
    if (followingUserIdRef.current === 'self') {
      setFollow('')
    } else {
      setFollow('self')
    }
  }

  const handleFollowUser = (userId: string) => {
    if (followingUserIdRef.current === userId) {
      setFollow('')
    } else {
      setFollow(userId)
    }
  }

  const userArray = Array.from(users.values()).filter(u => u.id !== myId)
  const followedUser = followingUserId && followingUserId !== 'self'
    ? users.get(followingUserId)
    : null

  let followButtonLabel = 'Seguir'
  if (followingUserId === 'self') {
    followButtonLabel = 'Siguiéndote'
  } else if (followedUser) {
    followButtonLabel = `Siguiendo a ${followedUser.name}`
  }

  return (
    <div className="room-container">
      <div className="room-header">
        <div className="room-header-left">
          <div>
            <div className="room-code-label">Sala</div>
            <div className="room-code-value">{roomId}</div>
          </div>
          <div className="user-dot" style={{ background: myColor }} />
          <span style={{ fontSize: '0.875rem' }}>Tú</span>
        </div>

        <div className="room-header-right">
          {userArray.slice(0, 5).map(u => (
            <div
              key={u.id}
              className="user-badge"
              onClick={() => handleFollowUser(u.id)}
              style={{
                cursor: 'pointer',
                border: followingUserId === u.id ? `2px solid ${u.color}` : '2px solid transparent',
                transition: 'border-color 0.2s',
              }}
            >
              <div className="user-dot" style={{ background: u.color }} />
              <span>{u.name}</span>
            </div>
          ))}
          {userArray.length > 5 && (
            <span style={{ fontSize: '0.75rem', color: '#8888aa' }}>
              +{userArray.length - 5}
            </span>
          )}

          {geoError && (
            <span style={{ fontSize: '0.7rem', color: '#ff4757' }}>
              {geoError}
            </span>
          )}

          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: connected ? '#2ed573' : '#ff4757',
              flexShrink: 0,
            }}
            title={connected ? 'Conectado' : 'Desconectado'}
          />

          <button
            className={`btn ${followingUserId !== '' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={toggleFollow}
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}
          >
            {followButtonLabel}
          </button>

          <button
            className="btn btn-danger"
            onClick={leaveRoom}
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}
          >
            Salir
          </button>
        </div>
      </div>

      <MapView
        users={users}
        myId={myId}
        myPosition={myPosition}
        followingUserId={followingUserId}
        onFollowUser={handleFollowUser}
      />
    </div>
  )
}
