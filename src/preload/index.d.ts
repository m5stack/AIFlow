import { ElectronAPI } from '@electron-toolkit/preload'
import type { IpcAPI } from './ipcApi'

declare global {
  interface Window {
    electron: ElectronAPI
    ipc: IpcAPI
  }
}

export type { IpcAPI }
