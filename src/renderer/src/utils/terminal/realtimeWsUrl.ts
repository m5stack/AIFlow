export const REALTIME_WS_PORT = 28082
export const REALTIME_WS_PATH = '/ws/realtime'

export function buildRealtimeWsUrl(deviceId: string): string {
  const base = import.meta.env.VITE_API_BASE_URL ?? '/api'
  const params = `role=client&deviceId=${encodeURIComponent(deviceId)}`

  if (base.startsWith('http://') || base.startsWith('https://')) {
    const hostname = new URL(base).hostname
    return `ws://${hostname}:${REALTIME_WS_PORT}${REALTIME_WS_PATH}?${params}`
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}${REALTIME_WS_PATH}?${params}`
}
