export const REALTIME_WS_PATH = '/ws/realtime'

const buildWsUrl = (params: string): string => {
  const base = import.meta.env.VITE_API_BASE_URL ?? '/api'

  if (base.startsWith('http://') || base.startsWith('https://')) {
    const url = new URL(base)
    const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${url.host}${REALTIME_WS_PATH}?${params}`
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}${REALTIME_WS_PATH}?${params}`
}

export function buildRealtimeWsUrl(deviceId: string): string {
  return buildWsUrl(`role=client&deviceId=${encodeURIComponent(deviceId)}`)
}

export function buildDeviceStatusWsUrl(clientId: string): string {
  return buildWsUrl(`role=client&clientId=${encodeURIComponent(clientId)}`)
}
