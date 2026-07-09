import { create } from 'zustand'
import type { DeviceFileTreeNode } from '../types/device'

interface DeviceFileTreeStoreState {
  deviceId: string | null
  tree: DeviceFileTreeNode | null
  rootFsPath: string
  setTree: (deviceId: string, tree: DeviceFileTreeNode, rootFsPath: string) => void
  clear: () => void
}

export const useDeviceFileTreeStore = create<DeviceFileTreeStoreState>((set) => ({
  deviceId: null,
  tree: null,
  rootFsPath: '',
  setTree: (deviceId, tree, rootFsPath) => set({ deviceId, tree, rootFsPath }),
  clear: () => set({ deviceId: null, tree: null, rootFsPath: '' })
}))
