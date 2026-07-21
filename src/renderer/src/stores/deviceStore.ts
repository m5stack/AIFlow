import { create } from 'zustand'
import {
  getDevicesByTempId,
  renameDevice as renameDeviceApi,
  unbindDevice as unbindDeviceApi
} from '../api/device'
import type { DeviceItem } from '../types/device'
import { reconcileDeviceSnapshot } from '../utils/device/deviceSnapshot'
import { useClientIdStore } from './clientIdStore'

export type { DeviceItem }

interface DeviceStoreState {
  devices: DeviceItem[]
  loadedClientId: string | null
  addDevice: (device: DeviceItem) => void
  removeDevice: (id: string) => void
  unbindDevice: (deviceId: string) => Promise<void>
  renameDevice: (deviceId: string, name: string) => Promise<void>
  reconcileDevices: (devices: DeviceItem[]) => void
  updateDeviceStatus: (deviceId: string, status: DeviceItem['status']) => boolean
  fetchDevices: () => Promise<void>
}

const DEVICE_STORAGE_KEY = 'vibe:devices'

const safeParseDevices = (): DeviceItem[] => {
  const raw = localStorage.getItem(DEVICE_STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed.flatMap((value): DeviceItem[] => {
      if (typeof value !== 'object' || value === null) return []
      const item = value as Partial<DeviceItem>
      if (typeof item.id !== 'string' || !item.id) return []
      const type = typeof item.type === 'string' ? item.type : 'unknown'
      return [
        {
          id: item.id,
          name: typeof item.name === 'string' ? item.name : type,
          type,
          status: 'disconnected',
          pairCode: typeof item.pairCode === 'string' ? item.pairCode : undefined,
          tempId: typeof item.tempId === 'string' ? item.tempId : undefined,
          invalid: item.invalid === true
        }
      ]
    })
  } catch {
    return []
  }
}

const persistDevices = (devices: DeviceItem[]): void => {
  localStorage.setItem(DEVICE_STORAGE_KEY, JSON.stringify(devices))
}

export const useDeviceStore = create<DeviceStoreState>((set, get) => ({
  devices: safeParseDevices(),
  loadedClientId: null,
  addDevice: (device) => {
    set((state) => {
      const exists = state.devices.some((item) => item.id === device.id)
      const nextDevices = exists
        ? state.devices.map((item) =>
            item.id === device.id ? { ...item, ...device, invalid: false } : item
          )
        : [{ ...device, invalid: false }, ...state.devices]
      persistDevices(nextDevices)
      return { devices: nextDevices }
    })
  },
  removeDevice: (id) => {
    set((state) => {
      const nextDevices = state.devices.filter((item) => item.id !== id)
      persistDevices(nextDevices)
      return { devices: nextDevices }
    })
  },
  unbindDevice: async (deviceId) => {
    const device = get().devices.find((item) => item.id === deviceId)
    if (device?.invalid) {
      get().removeDevice(deviceId)
      return
    }

    const { clientId } = useClientIdStore.getState()
    await unbindDeviceApi({ tempId: clientId, deviceId })
    get().removeDevice(deviceId)
  },
  renameDevice: async (deviceId, name) => {
    await renameDeviceApi({ deviceId, name })
    const device = get().devices.find((item) => item.id === deviceId)
    if (device) {
      get().addDevice({ ...device, name })
    }
  },
  reconcileDevices: (devices) => {
    set((state) => {
      const nextDevices = reconcileDeviceSnapshot(state.devices, devices)
      persistDevices(nextDevices)
      return { devices: nextDevices }
    })
  },
  updateDeviceStatus: (deviceId, status) => {
    const device = get().devices.find((item) => item.id === deviceId)
    if (!device) return false
    if (device.status === status && !device.invalid) return true

    set((state) => {
      const nextDevices = state.devices.map((item) =>
        item.id === deviceId ? { ...item, status, invalid: false } : item
      )
      persistDevices(nextDevices)
      return { devices: nextDevices }
    })
    return true
  },
  fetchDevices: async () => {
    const { clientId } = useClientIdStore.getState()
    try {
      const devices = await getDevicesByTempId(clientId)
      if (useClientIdStore.getState().clientId !== clientId) return
      get().reconcileDevices(devices)
    } catch {
      // keep local cache on fetch failure
    } finally {
      if (useClientIdStore.getState().clientId === clientId) {
        set({ loadedClientId: clientId })
      }
    }
  }
}))
