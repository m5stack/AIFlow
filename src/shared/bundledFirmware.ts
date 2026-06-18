/** Directory under `resources/` (dev) or `process.resourcesPath` (packaged). */
export const BUNDLED_FIRMWARE_DIR = 'firmware'

/** Default UIFlow2 firmware image shipped with the app. */
export const BUNDLED_FIRMWARE_FILENAME = 'aiflow-sticks3.bin'

export interface BundledFirmwareInfo {
  exists: boolean
  fileName: string
  byteLength?: number
}
