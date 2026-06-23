import { createRequire } from 'module'
import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { app, ipcMain } from 'electron'
import { BUNDLED_FIRMWARE_DIR, BUNDLED_FIRMWARES } from '../../shared/bundledFirmware'

const require = createRequire(__filename)

function bundledFirmwareRoot(): string {
  return app.isPackaged
    ? join(process.resourcesPath, BUNDLED_FIRMWARE_DIR)
    : join(process.cwd(), 'resources', BUNDLED_FIRMWARE_DIR)
}

function resolveBundledFirmwarePath(fileName: string): string {
  return join(bundledFirmwareRoot(), fileName)
}

function resolveNvsPartitionGenPath(): string {
  const candidates = [
    join(__dirname, 'nvs_partition_gen.js'),
    join(process.cwd(), 'src/shared/vendor/nvs_partition_gen.js')
  ]
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }
  throw new Error(
    'nvs_partition_gen.js not found. Expected beside main bundle or at src/shared/vendor/nvs_partition_gen.js'
  )
}

type NvsPartitionGenModule = {
  generateFromCsv: (options: {
    csvText: string
    size: number | string
    version?: number
  }) => Buffer
}

let nvsPartitionGenModule: NvsPartitionGenModule | null = null

function getNvsPartitionGen(): NvsPartitionGenModule {
  if (!nvsPartitionGenModule) {
    nvsPartitionGenModule = require(resolveNvsPartitionGenPath()) as NvsPartitionGenModule
  }
  return nvsPartitionGenModule
}

async function readBundledFirmware(fileName: string): Promise<Uint8Array> {
  const entry = BUNDLED_FIRMWARES.find((item) => item.fileName === fileName)
  if (!entry) {
    throw new Error(`Unknown bundled firmware: ${fileName}`)
  }

  const path = resolveBundledFirmwarePath(fileName)
  if (!existsSync(path)) {
    throw new Error(
      `Bundled firmware not found at ${path}. Place ${fileName} in resources/firmware/.`
    )
  }
  const buffer = await readFile(path)
  return Uint8Array.from(buffer)
}

export function registerFirmwareIpc(): void {
  ipcMain.removeHandler('firmware:generateNvsFromCsv')
  ipcMain.removeHandler('firmware:readBundled')

  ipcMain.handle(
    'firmware:generateNvsFromCsv',
    (_event, csvText: string, size: number | string, version = 2) => {
      const mod = getNvsPartitionGen()
      const bin = mod.generateFromCsv({ csvText, size, version })
      return Uint8Array.from(bin)
    }
  )

  ipcMain.handle('firmware:readBundled', (_event, fileName: string) =>
    readBundledFirmware(fileName)
  )
}
