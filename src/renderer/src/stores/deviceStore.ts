import { create } from 'zustand'
import { getDevicesByTempId, renameDevice as renameDeviceApi, unbindDevice as unbindDeviceApi } from '../api/device'
import type { DeviceItem } from '../types/device'
import { useClientIdStore } from './clientIdStore'

export type { DeviceItem }

interface DeviceStoreState {
  devices: DeviceItem[]
  addDevice: (device: DeviceItem) => void
  removeDevice: (id: string) => void
  unbindDevice: (deviceId: string) => Promise<void>
  renameDevice: (deviceId: string, name: string) => Promise<void>
  setDevices: (devices: DeviceItem[]) => void
  fetchDevices: () => Promise<void>
}

const DEVICE_STORAGE_KEY = 'vibe:devices'

const safeParseDevices = (): DeviceItem[] => {
  const raw = localStorage.getItem(DEVICE_STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as DeviceItem[]) : []
  } catch {
    return []
  }
}

const persistDevices = (devices: DeviceItem[]): void => {
  localStorage.setItem(DEVICE_STORAGE_KEY, JSON.stringify(devices))
}

export const useDeviceStore = create<DeviceStoreState>((set, get) => ({
  devices: safeParseDevices(),
  addDevice: (device) => {
    set((state) => {
      const exists = state.devices.some((item) => item.id === device.id)
      const nextDevices = exists
        ? state.devices.map((item) => (item.id === device.id ? { ...item, ...device } : item))
        : [device, ...state.devices]
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
  setDevices: (devices) => {
    persistDevices(devices)
    set({ devices })
  },
  fetchDevices: async () => {
    const { clientId } = useClientIdStore.getState()
    try {
      const devices = await getDevicesByTempId(clientId)
      persistDevices(devices)
      set({ devices })
    } catch {
      // keep local cache on fetch failure
    }
  }
}))
