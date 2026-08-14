import { createRequire } from 'module'
import { existsSync } from 'fs'
import { join } from 'path'
import { ipcMain } from 'electron'

const require = createRequire(__filename)

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
  generateFromCsv: (options: { csvText: string; size: number | string; version?: number }) => Buffer
}

let nvsPartitionGenModule: NvsPartitionGenModule | null = null

function getNvsPartitionGen(): NvsPartitionGenModule {
  if (!nvsPartitionGenModule) {
    nvsPartitionGenModule = require(resolveNvsPartitionGenPath()) as NvsPartitionGenModule
  }
  return nvsPartitionGenModule
}

export function registerFirmwareIpc(): void {
  ipcMain.removeHandler('firmware:generateNvsFromCsv')

  ipcMain.handle(
    'firmware:generateNvsFromCsv',
    (_event, csvText: string, size: number | string, version = 2) => {
      const mod = getNvsPartitionGen()
      const bin = mod.generateFromCsv({ csvText, size, version })
      return Uint8Array.from(bin)
    }
  )
}
