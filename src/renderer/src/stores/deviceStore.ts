import { create } from 'zustand'
import { getDevicesByTempId, renameDevice as renameDeviceApi, unbindDevice as unbindDeviceApi } from '../api/device'
import type { DeviceItem } from '../types/device'

export type { DeviceItem }

interface DeviceStoreState {
  tempId: string
  devices: DeviceItem[]
  addDevice: (device: DeviceItem) => void
  removeDevice: (id: string) => void
  unbindDevice: (deviceId: string) => Promise<void>
  renameDevice: (deviceId: string, name: string) => Promise<void>
  setDevices: (devices: DeviceItem[]) => void
  fetchDevices: () => Promise<void>
}

const DEVICE_STORAGE_KEY = 'vibe:devices'
const DEVICE_TEMP_ID_KEY = 'vibe:deviceTempId'

const sanitizeTempId = (value: string): string => value.replace(/-/g, '')

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

const createTempId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return sanitizeTempId(crypto.randomUUID())
  }
  return `temp${Date.now()}${Math.floor(Math.random() * 1000000)}`
}

const getOrCreateTempId = (): string => {
  const existing = localStorage.getItem(DEVICE_TEMP_ID_KEY)
  if (existing) {
    const sanitized = sanitizeTempId(existing)
    if (sanitized !== existing) {
      localStorage.setItem(DEVICE_TEMP_ID_KEY, sanitized)
    }
    return sanitized
  }
  const next = createTempId()
  localStorage.setItem(DEVICE_TEMP_ID_KEY, next)
  return next
}

const persistDevices = (devices: DeviceItem[]): void => {
  localStorage.setItem(DEVICE_STORAGE_KEY, JSON.stringify(devices))
}

export const useDeviceStore = create<DeviceStoreState>((set, get) => ({
  tempId: getOrCreateTempId(),
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
    const { tempId } = get()
    await unbindDeviceApi({ tempId, deviceId })
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
    const { tempId } = get()
    try {
      const devices = await getDevicesByTempId(tempId)
      persistDevices(devices)
      set({ devices })
    } catch {
      // keep local cache on fetch failure
    }
  }
}))
