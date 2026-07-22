import { toast } from '@heroui/react'
import type { DeviceItem } from '../../types/device'
import { useDeviceStore } from '../../stores/deviceStore'
import type { ConfirmDialogFn } from '../../components/common/confirmDialogContext'

export async function removeDeviceWithConfirm(options: {
  deviceId: string
  deviceName?: string
  unbindDevice: (id: string) => Promise<void>
  clearActiveDeviceReferences: (id: string) => Promise<void>
  confirm: ConfirmDialogFn
  onAfterRemove?: (remainingDevices: DeviceItem[]) => void
}): Promise<boolean> {
  const {
    deviceId,
    deviceName,
    unbindDevice,
    clearActiveDeviceReferences,
    confirm,
    onAfterRemove
  } = options
  const label = deviceName?.trim() || deviceId
  const confirmed = await confirm({
    title: 'Remove device?',
    description:
      'This device will be removed from the device list and unlinked from active projects.',
    itemName: label,
    confirmLabel: 'Remove'
  })
  if (!confirmed) return false

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
