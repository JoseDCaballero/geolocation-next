export interface Position {
  lat: number
  lng: number
  timestamp: number
}

export interface UserData {
  id: string
  color: string
  name: string
  position?: { lat: number; lng: number }
  trail: Position[]
}

export interface RoomData {
  id: string
  password?: string
  users: Map<string, UserData>
}

export interface ServerToClientEvents {
  'room-created': (data: { roomId: string }) => void
  'room-joined': (data: {
    roomId: string
    userId: string
    users: { id: string; color: string; name: string; position?: { lat: number; lng: number } }[]
    trails: { userId: string; trail: Position[] }[]
    color: string
  }) => void
  'user-joined': (data: { id: string; color: string; name: string }) => void
  'user-left': (data: { userId: string }) => void
  'user-moved': (data: { userId: string; lat: number; lng: number }) => void
  'error': (data: { message: string }) => void
}

export interface ClientToServerEvents {
  'create-room': (data?: { password?: string }) => void
  'join-room': (data: { roomId: string; password?: string; name: string }) => void
  'update-position': (data: { lat: number; lng: number }) => void
}
