import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

const SocketContext = createContext(null)

const getSocketUrl = () => {
  const rawUrl = process.env.REACT_APP_SOCKET_URL || 
    process.env.REACT_APP_API_URL || 
    'http://localhost:5000'
  
  return rawUrl.replace(/\/$/, '')
}

const SOCKET_URL = getSocketUrl()

export function SocketProvider({ children }) {
  const socketRef = useRef(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    console.log('[SocketProvider] Connecting to Socket.io server at:', SOCKET_URL)

    socketRef.current = io(SOCKET_URL, {
      transports: ['polling', 'websocket'], // Starts with polling for guaranteed connectivity behind proxies/CDNs, then upgrades to websocket
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    })

    socketRef.current.on('connect', () => {
      console.log('[SocketProvider] Socket connected successfully:', socketRef.current.id)
      setConnected(true)
    })

    socketRef.current.on('disconnect', (reason) => {
      console.warn('[SocketProvider] Socket disconnected. Reason:', reason)
      setConnected(false)
    })

    socketRef.current.on('connect_error', (err) => {
      console.error('[SocketProvider] Socket connection error:', err.message, err)
      setConnected(false)
    })

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [])

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => useContext(SocketContext)

