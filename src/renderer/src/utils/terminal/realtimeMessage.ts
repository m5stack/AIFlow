import type { RealtimeMessage, RealtimeMessageType } from '../../types/realtimeProtocol'

/** Server heartbeat frames must not count as REPL init device output. */
export function isWsHeartbeatMessage(raw: string): boolean {
  const trimmed = raw.trim()
  return trimmed === 'PONG' || trimmed === 'PING'
}

export function parseRealtimeMessage(data: string): RealtimeMessage | null {
  try {
    const parsed = JSON.parse(data) as Partial<RealtimeMessage>
    if (typeof parsed.type !== 'string') return null
    if (parsed.payload === undefined || parsed.payload === null) return null

    return {
      type: parsed.type as RealtimeMessageType,
      deviceId: parsed.deviceId ?? null,
      mac: parsed.mac ?? null,
      payload: String(parsed.payload),
      time: typeof parsed.time === 'number' ? parsed.time : Date.now()
    }
  } catch {
    return null
  }
}
