import { create } from 'zustand'
import { previewDeviceFile } from '../api/device'
import { parseDeviceFilePreview } from '../utils/device/parseDeviceFilePreview'

export type DeviceFilePreviewSelection = {
  kind: 'image' | 'text' | 'unsupported'
  name: string
  path: string
  url?: string
  content?: string
  language?: string
}

interface DeviceFilePreviewStoreState {
  selectedFile: DeviceFilePreviewSelection | null
  isLoading: boolean
  error: string | null
  loadPreview: (payload: {
    deviceId: string
    clientId: string
    filePath: string
    fileName: string
  }) => Promise<void>
  markPreviewLoadFailed: () => void
  clearPreview: () => void
}

let activeImageObjectUrl: string | null = null

const revokeActiveImageObjectUrl = (): void => {
  if (!activeImageObjectUrl) return
  URL.revokeObjectURL(activeImageObjectUrl)
  activeImageObjectUrl = null
}

export const useDeviceFilePreviewStore = create<DeviceFilePreviewStoreState>((set) => ({
  selectedFile: null,
  isLoading: false,
  error: null,
  loadPreview: async ({ deviceId, clientId, filePath, fileName }) => {
    revokeActiveImageObjectUrl()
    set({
      isLoading: true,
      error: null,
      selectedFile: null
    })
    try {
      const response = await previewDeviceFile({ deviceId, clientId, filePath })
      const preview = parseDeviceFilePreview(response, fileName)
      if (preview.kind === 'unsupported') {
        set({
          selectedFile: { kind: 'unsupported', name: fileName, path: filePath },
          isLoading: false,
          error: null
        })
        return
      }
      if (preview.kind === 'image') {
        const blob = new Blob([Uint8Array.from(preview.bytes)], { type: preview.mime })
        const objectUrl = URL.createObjectURL(blob)
        activeImageObjectUrl = objectUrl
        set({
          selectedFile: { kind: 'image', name: fileName, path: filePath, url: objectUrl },
          isLoading: false,
          error: null
        })
        return
      }
      set({
        selectedFile: {
          kind: 'text',
          name: fileName,
          path: filePath,
          content: preview.content,
          language: preview.language
        },
        isLoading: false,
        error: null
      })
    } catch (err) {
      revokeActiveImageObjectUrl()
      set({
        selectedFile: null,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to preview file'
      })
    }
  },
  markPreviewLoadFailed: () => {
    revokeActiveImageObjectUrl()
    set((state) => {
      if (!state.selectedFile || state.selectedFile.kind !== 'image') return state
      return {
        selectedFile: {
          kind: 'unsupported',
          name: state.selectedFile.name,
          path: state.selectedFile.path
        }
      }
    })
  },
  clearPreview: () => {
    revokeActiveImageObjectUrl()
    set({ selectedFile: null, isLoading: false, error: null })
  }
}))
