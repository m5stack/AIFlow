import type { DeviceItem } from '../../types/device'

type StatusDevice = Pick<DeviceItem, 'status' | 'invalid'>

export interface DeviceStatusPresentation {
  label: 'Online' | 'Offline' | 'Invalid'
  color: string
}

export const getDeviceStatusPresentation = (device: StatusDevice): DeviceStatusPresentation => {
  if (device.invalid) return { label: 'Invalid', color: '#f59e0b' }
  if (device.status === 'connected') {
    return { label: 'Online', color: 'var(--status-connected)' }
  }
  return { label: 'Offline', color: 'var(--status-disconnected)' }
}
