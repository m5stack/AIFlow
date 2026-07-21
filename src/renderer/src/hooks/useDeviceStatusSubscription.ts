import { useEffect } from 'react'
import { normalizeDeviceItem, normalizeDeviceStatus } from '../api/deviceNormalize'
import { useClientIdStore } from '../stores/clientIdStore'
import { useDeviceStore } from '../stores/deviceStore'
import {
  isDeviceStatusHeartbeatMessage,
  parseDeviceStatusMessage
} from '../utils/device/deviceStatusMessage'
import { buildDeviceStatusWsUrl } from '../utils/terminal/realtimeWsUrl'

const HEARTBEAT_INTERVAL_MS = 30_000
const RECONNECT_DELAYS_MS = [1_000, 2_000, 5_000, 10_000, 30_000] as const

export function useDeviceStatusSubscription(): void {
  const clientId = useClientIdStore((state) => state.clientId)
  const isClientIdBootstrapped = useClientIdStore((state) => state.isBootstrapped)
  const loadedClientId = useDeviceStore((state) => state.loadedClientId)
  const hasBoundDevices = useDeviceStore((state) => state.devices.some((device) => !device.invalid))
  const fetchDevices = useDeviceStore((state) => state.fetchDevices)
  const reconcileDevices = useDeviceStore((state) => state.reconcileDevices)
  const updateDeviceStatus = useDeviceStore((state) => state.updateDeviceStatus)

  useEffect(() => {
    if (!isClientIdBootstrapped) return
    void fetchDevices()
  }, [clientId, fetchDevices, isClientIdBootstrapped])

  useEffect(() => {
    if (!isClientIdBootstrapped || loadedClientId !== clientId || !hasBoundDevices) return

    let disposed = false
    let socket: WebSocket | null = null
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let reconnectAttempt = 0
    let unknownDeviceRefreshPending = false

    const clearHeartbeat = (): void => {
      if (!heartbeatTimer) return
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }

    const clearReconnect = (): void => {
      if (!reconnectTimer) return
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }

    const closeSocket = (): void => {
      const current = socket
      socket = null
      clearHeartbeat()
      if (!current) return
      current.onopen = null
      current.onmessage = null
      current.onerror = null
      current.onclose = null
      if (current.readyState === WebSocket.OPEN || current.readyState === WebSocket.CONNECTING) {
        current.close()
      }
    }

    const scheduleReconnect = (): void => {
      if (disposed || reconnectTimer) return
      const delay = RECONNECT_DELAYS_MS[Math.min(reconnectAttempt, RECONNECT_DELAYS_MS.length - 1)]
      reconnectAttempt += 1
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null
        connect()
      }, delay)
    }

    const connect = (): void => {
      if (disposed) return
      if (socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING)
        return

      clearReconnect()
      let nextSocket: WebSocket
      try {
        nextSocket = new WebSocket(buildDeviceStatusWsUrl(clientId))
      } catch {
        scheduleReconnect()
        return
      }
      socket = nextSocket

      nextSocket.onopen = () => {
        if (disposed || socket !== nextSocket) return
        nextSocket.send('PING')
        heartbeatTimer = setInterval(() => {
          if (nextSocket.readyState === WebSocket.OPEN) nextSocket.send('PING')
        }, HEARTBEAT_INTERVAL_MS)
      }

      nextSocket.onmessage = (event) => {
        if (disposed || socket !== nextSocket || typeof event.data !== 'string') return
        if (isDeviceStatusHeartbeatMessage(event.data)) return

        const message = parseDeviceStatusMessage(event.data)
        if (!message || message.clientId !== clientId) return

        if (message.type === 'deviceStatusList') {
          reconnectAttempt = 0
          reconcileDevices(
            message.devices.map((device) => normalizeDeviceItem(device, { tempId: clientId }))
          )
          return
        }

        if (message.type === 'deviceStatusChanged') {
          const known = updateDeviceStatus(message.deviceId, normalizeDeviceStatus(message.status))
          if (!known && !unknownDeviceRefreshPending) {
            unknownDeviceRefreshPending = true
            void fetchDevices().finally(() => {
              unknownDeviceRefreshPending = false
            })
          }
          return
        }

        if (message.payload === 'clientId does not exist') {
          reconcileDevices([])
        }
        nextSocket.close()
      }

      nextSocket.onerror = () => {
        if (socket === nextSocket) nextSocket.close()
      }

      nextSocket.onclose = () => {
        if (socket !== nextSocket) return
        socket = null
        clearHeartbeat()
        scheduleReconnect()
      }
    }

    const handleOnline = (): void => {
      reconnectAttempt = 0
      clearReconnect()
      connect()
    }

    window.addEventListener('online', handleOnline)
    connect()

    return () => {
      disposed = true
      window.removeEventListener('online', handleOnline)
      clearReconnect()
      closeSocket()
    }
  }, [
    clientId,
    fetchDevices,
    hasBoundDevices,
    isClientIdBootstrapped,
    loadedClientId,
    reconcileDevices,
    updateDeviceStatus
  ])
}
