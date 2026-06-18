import { useCallback, useEffect, useRef, useState } from 'react'
import { buildRealtimeWsUrl } from '../utils/terminal/realtimeWsUrl'
import { formatTerminalSystemLine } from '../utils/terminal/terminalOutput'
import { hasReplPrompt, initReplSession } from '../utils/terminal/replInit'
import { PasteFlow, mayEnterPasteMode, sendKeyboardPayload } from '../utils/terminal/pasteFlow'
import { isWsHeartbeatMessage, parseRealtimeMessage } from '../utils/terminal/realtimeMessage'

export type RealtimeTerminalStatus = 'idle' | 'connecting' | 'connected' | 'error'

/** WebSocket connection timeout in seconds. */
export const REALTIME_CONNECT_TIMEOUT_SEC = 30

/** Heartbeat interval in seconds (server idle timeout is 60s). */
const HEARTBEAT_INTERVAL_SEC = 30

interface UseRealtimeTerminalOptions {
  /** When true, connect automatically for a valid device and reconnect on device change. */
  autoConnect?: boolean
  deviceName?: string
}

interface UseRealtimeTerminalResult {
  status: RealtimeTerminalStatus
  errorMessage: string
  connect: () => Promise<boolean>
  disconnect: () => Promise<void>
  sendData: (data: string) => void
  setTerminalDataHandler: (handler: ((data: string) => void) | null) => void
}

export function useRealtimeTerminal(
  deviceId: string,
  { autoConnect = false, deviceName = '' }: UseRealtimeTerminalOptions = {}
): UseRealtimeTerminalResult {
  const [status, setStatus] = useState<RealtimeTerminalStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const statusRef = useRef<RealtimeTerminalStatus>('idle')
  statusRef.current = status
  const wsRef = useRef<WebSocket | null>(null)
  const terminalHandlerRef = useRef<((data: string) => void) | null>(null)
  const pendingOutputRef = useRef<string[]>([])
  const pasteFlowRef = useRef(new PasteFlow())
  const connectAttemptRef = useRef(0)
  const replInitSessionRef = useRef(0)
  const replInitGotResponseRef = useRef(false)
  const replInitOutputBufferRef = useRef('')
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sessionDeviceRef = useRef({ id: '', name: '' })
  const deviceNameRef = useRef(deviceName)
  deviceNameRef.current = deviceName

  const cancelReplInitRetry = useCallback((): void => {
    replInitSessionRef.current += 1
    replInitGotResponseRef.current = false
    replInitOutputBufferRef.current = ''
  }, [])

  const noteReplInitOutput = useCallback((output: string): void => {
    if (replInitGotResponseRef.current || !output) return
    replInitOutputBufferRef.current += output
    if (hasReplPrompt(replInitOutputBufferRef.current)) {
      replInitGotResponseRef.current = true
    }
  }, [])

  const clearHeartbeat = useCallback((): void => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current)
      heartbeatRef.current = null
    }
  }, [])

  const startHeartbeat = useCallback((): void => {
    clearHeartbeat()
    heartbeatRef.current = setInterval(() => {
      const ws = wsRef.current
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send('PING')
      }
    }, HEARTBEAT_INTERVAL_SEC * 1000)
  }, [clearHeartbeat])

  const writeToTerminal = useCallback((data: string): void => {
    if (!data) return
    const handler = terminalHandlerRef.current
    if (handler) {
      handler(data)
      return
    }
    pendingOutputRef.current.push(data)
  }, [])

  const writeSystemLine = useCallback(
    (line: string): void => {
      writeToTerminal(formatTerminalSystemLine(line))
    },
    [writeToTerminal]
  )

  const formatSessionMessage = useCallback(
    (
      kind: 'connecting' | 'connected' | 'disconnected' | 'failed',
      session: { id: string; name: string },
      detail = ''
    ): string => {
      const label = session.name.trim() || session.id.trim()
      const target = label ? ` ${label}` : ''
      switch (kind) {
        case 'connecting':
          return `Connecting to${target}...`
        case 'connected':
          return `Connected to${target}`
        case 'disconnected':
          return `Disconnected from${target}`
        case 'failed':
          return detail
            ? `Connection failed${label ? ` (${label})` : ''}: ${detail}`
            : `Connection failed${label ? ` (${label})` : ''}`
      }
    },
    []
  )

  const setTerminalDataHandler = useCallback((handler: ((data: string) => void) | null): void => {
    terminalHandlerRef.current = handler
    if (!handler) return

    const pending = pendingOutputRef.current
    if (pending.length === 0) return

    pendingOutputRef.current = []
    for (const chunk of pending) {
      handler(chunk)
    }
  }, [])

  const flushPaste = useCallback((): void => {
    const ws = wsRef.current
    if (ws?.readyState !== WebSocket.OPEN) return
    pasteFlowRef.current.flushReady((payload) => ws.send(payload))
  }, [])

  const deliverDeviceOutput = useCallback(
    (payload: string): void => {
      writeToTerminal(payload)
      const flow = pasteFlowRef.current
      if (!flow.isActive()) return
      flow.observeOutput(payload)
      flushPaste()
    },
    [flushPaste, writeToTerminal]
  )

  const sendRawPayload = useCallback((payload: string): void => {
    const ws = wsRef.current
    if (ws?.readyState !== WebSocket.OPEN || payload.length === 0) return

    sendKeyboardPayload((chunk) => ws.send(chunk), payload)
  }, [])

  const scheduleReplInit = useCallback(async (): Promise<void> => {
    const sessionId = ++replInitSessionRef.current
    replInitGotResponseRef.current = false
    replInitOutputBufferRef.current = ''

    await initReplSession(sendRawPayload, {
      shouldContinue: () =>
        sessionId === replInitSessionRef.current &&
        wsRef.current?.readyState === WebSocket.OPEN,
      hasResponse: () => replInitGotResponseRef.current
    })
  }, [sendRawPayload])

  const sendPasteInput = useCallback(
    (data: string): void => {
      const flow = pasteFlowRef.current
      const direct = flow.handleInput(data)
      if (direct.length > 0) {
        sendRawPayload(direct)
      }
      flushPaste()
    },
    [flushPaste, sendRawPayload]
  )

  const handleWsMessage = useCallback(
    (raw: string, onClientConnected: () => void): void => {
      if (isWsHeartbeatMessage(raw)) return

      const message = parseRealtimeMessage(raw)
      if (!message) {
        noteReplInitOutput(raw)
        deliverDeviceOutput(raw)
        return
      }

      switch (message.type) {
        case 'clientConnected':
          onClientConnected()
          break
        case 'deviceLog':
          noteReplInitOutput(message.payload)
          deliverDeviceOutput(message.payload)
          break
        case 'deviceConnected':
          writeSystemLine('Device online')
          void scheduleReplInit()
          break
        case 'deviceOffline':
          writeSystemLine('Device offline')
          cancelReplInitRetry()
          break
        case 'error':
          throw new Error(message.payload || 'Connection error')
        default:
          break
      }
    },
    [cancelReplInitRetry, deliverDeviceOutput, noteReplInitOutput, scheduleReplInit, writeSystemLine]
  )

  const disconnect = useCallback(
    async (options?: { silent?: boolean }): Promise<void> => {
      connectAttemptRef.current += 1
      cancelReplInitRetry()
      pasteFlowRef.current.reset()
      clearHeartbeat()
      const ws = wsRef.current
      wsRef.current = null
      const wasActive =
        statusRef.current === 'connected' ||
        statusRef.current === 'connecting' ||
        ws?.readyState === WebSocket.OPEN ||
        ws?.readyState === WebSocket.CONNECTING

      if (!ws) {
        if (!options?.silent && wasActive) {
          writeSystemLine(formatSessionMessage('disconnected', sessionDeviceRef.current))
        }
        if (!options?.silent) {
          sessionDeviceRef.current = { id: '', name: '' }
        }
        setStatus('idle')
        setErrorMessage('')
        return
      }

      if (!options?.silent && wasActive) {
        writeSystemLine(formatSessionMessage('disconnected', sessionDeviceRef.current))
      }
      if (!options?.silent) {
        sessionDeviceRef.current = { id: '', name: '' }
      }
      ws.onopen = null
      ws.onmessage = null
      ws.onerror = null
      ws.onclose = null
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close()
      }
      setStatus('idle')
      setErrorMessage('')
    },
    [cancelReplInitRetry, clearHeartbeat, formatSessionMessage, writeSystemLine]
  )

  const connect = useCallback(async (): Promise<boolean> => {
    const trimmedDeviceId = deviceId.trim()
    if (!trimmedDeviceId) {
      setStatus('error')
      setErrorMessage('Device is required')
      return false
    }

    const nextSession = { id: trimmedDeviceId, name: deviceNameRef.current.trim() }
    const prevSession = sessionDeviceRef.current
    const wasActive =
      statusRef.current === 'connected' ||
      statusRef.current === 'connecting' ||
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING

    if (wasActive && prevSession.id) {
      writeSystemLine(formatSessionMessage('disconnected', prevSession))
    }

    await disconnect({ silent: true })

    const attemptId = ++connectAttemptRef.current
    setStatus('connecting')
    setErrorMessage('')
    writeSystemLine(formatSessionMessage('connecting', nextSession))

    let connected = false

    try {
      await Promise.race([
        new Promise<void>((resolve, reject) => {
          const ws = new WebSocket(buildRealtimeWsUrl(trimmedDeviceId))
          wsRef.current = ws

          ws.onopen = () => {
            if (attemptId !== connectAttemptRef.current) return
          }

          ws.onmessage = (event) => {
            if (attemptId !== connectAttemptRef.current) return

            const raw = typeof event.data === 'string' ? event.data : String(event.data)

            try {
              handleWsMessage(raw, () => {
                if (connected) return
                connected = true
                sessionDeviceRef.current = nextSession
                setStatus('connected')
                writeSystemLine(formatSessionMessage('connected', nextSession))
                startHeartbeat()
                resolve()
              })
            } catch (error) {
              setErrorMessage(error instanceof Error ? error.message : 'Connection error')
              setStatus('error')
              ws.close()
              reject(error instanceof Error ? error : new Error('Connection error'))
            }
          }

          ws.onerror = () => {
            if (attemptId !== connectAttemptRef.current) return
            reject(new Error('WebSocket connection failed'))
          }

          ws.onclose = () => {
            if (attemptId !== connectAttemptRef.current) return
            clearHeartbeat()
            if (wsRef.current === ws) {
              wsRef.current = null
            }
            if (!connected) {
              reject(new Error('Connection closed before handshake'))
              return
            }
            writeSystemLine(formatSessionMessage('disconnected', sessionDeviceRef.current))
            sessionDeviceRef.current = { id: '', name: '' }
            setStatus('idle')
          }
        }),
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Connection timed out after ${REALTIME_CONNECT_TIMEOUT_SEC}s`))
          }, REALTIME_CONNECT_TIMEOUT_SEC * 1000)
        })
      ])

      if (attemptId !== connectAttemptRef.current) return false

      if (connected) {
        void scheduleReplInit()
      }

      return connected
    } catch (error) {
      if (attemptId !== connectAttemptRef.current) return false

      clearHeartbeat()
      const ws = wsRef.current
      wsRef.current = null
      if (ws) {
        ws.onopen = null
        ws.onmessage = null
        ws.onerror = null
        ws.onclose = null
        ws.close()
      }

      const message = error instanceof Error ? error.message : 'Connection failed'
      writeSystemLine(formatSessionMessage('failed', nextSession, message))
      setErrorMessage(message)
      setStatus('error')
      return false
    }
  }, [
    clearHeartbeat,
    deviceId,
    disconnect,
    formatSessionMessage,
    handleWsMessage,
    scheduleReplInit,
    startHeartbeat,
    writeSystemLine
  ])

  const sendData = useCallback(
    (data: string): void => {
      const flow = pasteFlowRef.current
      if (!flow.isActive() && !mayEnterPasteMode(data)) {
        sendRawPayload(data)
        return
      }
      sendPasteInput(data)
    },
    [sendPasteInput, sendRawPayload]
  )

  useEffect(() => {
    return () => {
      void disconnect({ silent: true })
    }
  }, [disconnect])

  useEffect(() => {
    if (!autoConnect || !deviceId.trim()) {
      void disconnect()
      return
    }

    let cancelled = false
    void connect().then(() => {
      if (cancelled) return
    })

    return () => {
      cancelled = true
    }
  }, [autoConnect, deviceId, connect, disconnect])

  return {
    status,
    errorMessage,
    connect,
    disconnect,
    sendData,
    setTerminalDataHandler
  }
}
