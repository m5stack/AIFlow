import { create } from 'zustand'
import type { DeviceFileTreeNode } from '../types/device'

interface DeviceFileTreeStoreState {
  deviceId: string | null
  tree: DeviceFileTreeNode | null
  rootFsPath: string
  refreshVersionByDeviceId: Record<string, number>
  setTree: (deviceId: string, tree: DeviceFileTreeNode, rootFsPath: string) => void
  requestRefresh: (deviceId: string) => void
  clear: () => void
}

export const useDeviceFileTreeStore = create<DeviceFileTreeStoreState>((set) => ({
  deviceId: null,
  tree: null,
  rootFsPath: '',
  refreshVersionByDeviceId: {},
  setTree: (deviceId, tree, rootFsPath) => set({ deviceId, tree, rootFsPath }),
  requestRefresh: (deviceId) =>
    set((state) => ({
      refreshVersionByDeviceId: {
        ...state.refreshVersionByDeviceId,
        [deviceId]: (state.refreshVersionByDeviceId[deviceId] ?? 0) + 1
      }
    })),
  clear: () => set({ deviceId: null, tree: null, rootFsPath: '' })
}))

export const requestDeviceFileTreeRefresh = (deviceId: string): void => {
  if (!deviceId) return
  useDeviceFileTreeStore.getState().requestRefresh(deviceId)
}
