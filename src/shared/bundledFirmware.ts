/** Directory under `resources/` (dev) or `process.resourcesPath` (packaged). */
export const BUNDLED_FIRMWARE_DIR = 'firmware'

export interface BundledFirmwareEntry {
  id: string
  fileName: string
  label: string
}

/** UIFlow2 firmware images shipped with the app. */
export const BUNDLED_FIRMWARES: BundledFirmwareEntry[] = [
  { id: 'sticks3', fileName: 'aiflow-sticks3.bin', label: 'StickS3' },
  { id: 'stackchan', fileName: 'aiflow-stackchan.bin', label: 'StackChan' }
]

export const DEFAULT_BUNDLED_FIRMWARE_ID = BUNDLED_FIRMWARES[0].id

export function getBundledFirmwareEntry(id: string): BundledFirmwareEntry | undefined {
  return BUNDLED_FIRMWARES.find((entry) => entry.id === id)
}
