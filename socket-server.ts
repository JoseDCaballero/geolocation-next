import { createServer } from 'node:http'
import { Server } from 'socket.io'
import dotenv from 'dotenv'

dotenv.config()

const port = parseInt(process.env.SOCKET_PORT || '', 10)

interface TrailPoint {
  lat: number
  lng: number
  timestamp: number
}

interface RoomUser {
  id: string
  socketId: string
  color: string
  name: string
  position?: { lat: number; lng: number }
  trail: TrailPoint[]
}

interface Room {
  password?: string
  users: Map<string, RoomUser>
}

const rooms = new Map<string, Room>()

const USER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8B4D9', '#A8E6CF', '#FFB347', '#B19CD9', '#FF8C94',
]
let colorIndex = 0

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

const httpServer = createServer()

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
})

io.on('connection', (socket) => {
  let currentRoom: string | null = null

  socket.on('create-room', ({ password } = {}) => {
    let roomId = generateRoomCode()
    while (rooms.has(roomId)) {
      roomId = generateRoomCode()
    }

    rooms.set(roomId, {
      password: password || undefined,
      users: new Map(),
    })

    socket.emit('room-created', { roomId })
  })

  socket.on('join-room', ({ roomId, password, name }) => {
    const room = rooms.get(roomId)
    if (!room) {
      socket.emit('error', { message: 'Sala no encontrada' })
      return
    }
    if (room.password && room.password !== password) {
      socket.emit('error', { message: 'Contraseña incorrecta' })
      return
    }

    if (currentRoom) {
      const oldRoom = rooms.get(currentRoom)
      if (oldRoom) {
        oldRoom.users.delete(socket.id)
        if (oldRoom.users.size === 0) {
          rooms.delete(currentRoom)
        } else {
          socket.to(currentRoom).emit('user-left', { userId: socket.id })
        }
      }
      socket.leave(currentRoom)
    }

    currentRoom = roomId
    socket.join(roomId)

    const color = USER_COLORS[colorIndex % USER_COLORS.length]
    colorIndex++

    const user: RoomUser = {
      id: socket.id,
      socketId: socket.id,
      color,
      name: name || `Usuario ${room.users.size + 1}`,
      trail: [],
    }

    room.users.set(socket.id, user)

    const usersList = Array.from(room.users.values()).map(u => ({
      id: u.id,
      color: u.color,
      name: u.name,
      position: u.position,
    }))

    const trails = Array.from(room.users.values())
      .filter(u => u.trail.length > 0)
      .map(u => ({ userId: u.id, trail: u.trail }))

    socket.emit('room-joined', {
      roomId,
      userId: socket.id,
      users: usersList,
      trails,
      color,
    })

    socket.to(roomId).emit('user-joined', {
      id: socket.id,
      color,
      name: user.name,
    })
  })

  socket.on('update-position', ({ lat, lng }) => {
    if (!currentRoom) return
    const room = rooms.get(currentRoom)
    if (!room) return

    const user = room.users.get(socket.id)
    if (!user) return

    user.position = { lat, lng }
    user.trail.push({ lat, lng, timestamp: Date.now() })

    if (user.trail.length > 500) {
      user.trail = user.trail.slice(-500)
    }

    socket.to(currentRoom).emit('user-moved', {
      userId: socket.id,
      lat,
      lng,
    })
  })

  socket.on('disconnect', () => {
    if (currentRoom) {
      const room = rooms.get(currentRoom)
      if (room) {
        room.users.delete(socket.id)
        if (room.users.size === 0) {
          rooms.delete(currentRoom)
        } else {
          socket.to(currentRoom).emit('user-left', { userId: socket.id })
        }
      }
    }
  })
})

httpServer.listen(port, () => {
  console.log(`> Socket.IO server ready on http://localhost:${port}`)
})
