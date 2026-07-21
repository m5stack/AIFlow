import type {
  DeviceStatusChangedMessage,
  DeviceStatusErrorMessage,
  DeviceStatusListMessage,
  DeviceStatusMessage,
  DeviceStatusSnapshotItem
} from '../../types/deviceStatusProtocol'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isStatus = (value: unknown): value is 0 | 1 => value === 0 || value === 1

const isValidTime = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const parseSnapshotItem = (value: unknown): DeviceStatusSnapshotItem | null => {
  if (!isRecord(value)) return null
  if (typeof value.deviceId !== 'string' || !value.deviceId.trim()) return null
  if (value.name !== null && typeof value.name !== 'string') return null
  if (typeof value.type !== 'string') return null
  if (!isStatus(value.status)) return null

  return {
    deviceId: value.deviceId,
    name: value.name,
    type: value.type,
    status: value.status
  }
}

const parseListMessage = (
  value: Record<string, unknown>,
  clientId: string,
  time: number
): DeviceStatusListMessage | null => {
  if (!Array.isArray(value.devices)) return null
  const devices: DeviceStatusSnapshotItem[] = []
  for (const item of value.devices) {
    const parsed = parseSnapshotItem(item)
    if (!parsed) return null
    devices.push(parsed)
  }
  return { type: 'deviceStatusList', clientId, devices, time }
}

const parseChangedMessage = (
  value: Record<string, unknown>,
  clientId: string,
  time: number
): DeviceStatusChangedMessage | null => {
  if (typeof value.deviceId !== 'string' || !value.deviceId.trim()) return null
  if (!isStatus(value.status)) return null
  return {
    type: 'deviceStatusChanged',
    clientId,
    deviceId: value.deviceId,
    status: value.status,
    time
  }
}

const parseErrorMessage = (
  value: Record<string, unknown>,
  clientId: string,
  time: number
): DeviceStatusErrorMessage | null => {
  if (typeof value.payload !== 'string') return null
  return { type: 'error', clientId, payload: value.payload, time }
}

export const isDeviceStatusHeartbeatMessage = (raw: string): boolean => {
  const value = raw.trim()
  return value === 'PING' || value === 'PONG'
}

export const parseDeviceStatusMessage = (raw: string): DeviceStatusMessage | null => {
  try {
    const value: unknown = JSON.parse(raw)
    if (!isRecord(value)) return null
    if (typeof value.clientId !== 'string' || !value.clientId.trim()) return null
    if (!isValidTime(value.time)) return null

    switch (value.type) {
      case 'deviceStatusList':
        return parseListMessage(value, value.clientId, value.time)
      case 'deviceStatusChanged':
        return parseChangedMessage(value, value.clientId, value.time)
      case 'error':
        return parseErrorMessage(value, value.clientId, value.time)
      default:
        return null
    }
  } catch {
    return null
  }
}
