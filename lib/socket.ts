'use client'

import { io, Socket } from 'socket.io-client'
import type { ServerToClientEvents, ClientToServerEvents } from './types'

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || ''

let socket: TypedSocket | null = null

export function getSocket(): TypedSocket {
  if (!socket || !socket.connected) {
    if (socket) socket.disconnect()
    socket = io(SOCKET_URL || undefined, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    }) as TypedSocket
  }
  return socket
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
