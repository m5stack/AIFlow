import type { DeviceItem } from '../../types/device'

export const reconcileDeviceSnapshot = (
  currentDevices: DeviceItem[],
  snapshotDevices: DeviceItem[]
): DeviceItem[] => {
  const currentById = new Map(currentDevices.map((device) => [device.id, device]))
  const snapshotIds = new Set<string>()
  const reconciled: DeviceItem[] = []

  for (const device of snapshotDevices) {
    if (!device.id || snapshotIds.has(device.id)) continue
    snapshotIds.add(device.id)
    const current = currentById.get(device.id)
    reconciled.push({
      ...current,
      ...device,
      pairCode: device.pairCode ?? current?.pairCode,
      tempId: device.tempId ?? current?.tempId,
      invalid: false
    })
  }

  for (const device of currentDevices) {
    if (snapshotIds.has(device.id)) continue
    reconciled.push({ ...device, status: 'disconnected', invalid: true })
  }

  return reconciled
}
