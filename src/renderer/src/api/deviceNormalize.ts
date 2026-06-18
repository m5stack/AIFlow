import type { DeviceItem } from '../types/device'

export function normalizeDeviceStatus(raw: unknown): DeviceItem['status'] {
  if (raw === 0 || raw === '0') return 'connected'
  if (raw === 1 || raw === '1') return 'disconnected'
  return 'disconnected'
}

export function normalizeDeviceItem(
  raw: unknown,
  fallback?: { pairCode?: string; tempId?: string }
): DeviceItem {
  const data = (raw as Record<string, unknown>)?.data ?? raw
  const record = (data ?? {}) as Record<string, unknown>
  const id = String(record.deviceId ?? record.id ?? record._id ?? `device-${Date.now()}`)
  const type = String(record.deviceType ?? record.type ?? record.model ?? 'unknown')
  const name = String(record.name ?? type)

  return {
    id,
    name,
    type,
    status: normalizeDeviceStatus(record.status),
    pairCode: fallback?.pairCode,
    tempId: fallback?.tempId
  }
}

export function normalizeDeviceList(raw: unknown, tempId: string): DeviceItem[] {
  const payload = (raw as Record<string, unknown>)?.data ?? raw
  const list = Array.isArray(payload) ? payload : (payload as Record<string, unknown>)?.list
  if (!Array.isArray(list)) return []
  return list.map((item) => normalizeDeviceItem(item, { tempId }))
}
