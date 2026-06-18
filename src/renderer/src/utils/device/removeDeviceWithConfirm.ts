import { toast } from '@heroui/react'
import type { DeviceItem } from '../../types/device'
import { useDeviceStore } from '../../stores/deviceStore'

export async function removeDeviceWithConfirm(options: {
  deviceId: string
  deviceName?: string
  unbindDevice: (id: string) => Promise<void>
  clearActiveDeviceReferences: (id: string) => Promise<void>
  onAfterRemove?: (remainingDevices: DeviceItem[]) => void
}): Promise<boolean> {
  const { deviceId, deviceName, unbindDevice, clearActiveDeviceReferences, onAfterRemove } =
    options
  const label = deviceName?.trim() || deviceId
  if (!window.confirm(`Remove device "${label}"?`)) return false

  try {
    await unbindDevice(deviceId)
    await clearActiveDeviceReferences(deviceId)
    const remainingDevices = useDeviceStore.getState().devices
    onAfterRemove?.(remainingDevices)
    toast.success(`Device "${label}" removed.`)
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    toast.danger(`Remove device failed: ${message}`)
    return false
  }
}
