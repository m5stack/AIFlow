import { buildEspNvsCsv, parseEspNvsPartition, type EspNvsEntry } from './espNvs'

/** NVS partition size in firmware image (matches M5Burner / uiflow2-nvs-config.js). */
export const UIFLOW2_NVS_PARTITION_SIZE = 0x6000

/** Byte offset of NVS partition inside full firmware binary. */
export const UIFLOW2_NVS_OFFSET = 0x9000

/**
 * UIFlow2 NVS defaults (WiFi ssid/pwd from flash dialog).
 * net_mode must be "WIFI" — empty breaks m5sync (Startup never creates WLAN → isconnected on None).
 */
/** Default UIFlow2 backend host written to NVS `server` key during firmware flash. */
export const UIFLOW2_DEFAULT_SERVER = import.meta.env.VITE_DEFAULT_SERVER
export const UIFLOW2_OFFICIAL_SERVER = 'aiflow.m5stack.com'

export const UIFLOW2_NVS_DEFAULTS = {
  server: UIFLOW2_DEFAULT_SERVER,
  sntp0: 'ntp1.aliyun.com',
  timezone: 'GMT0',
  bootOpt: 1,
  netMode: 'WIFI',
  protocol: 'DHCP',
  ipAddr: '',
  netmask: '',
  gateway: '',
  dns: ''
} as const

export interface Uiflow2NvsConfig {
  ssid: string
  pwd: string
  server?: string
  sntp0?: string
  sntp1?: string
  sntp2?: string
  timezone?: string
  bootOpt?: number
  netMode?: string
  protocol?: string
  ipAddr?: string
  netmask?: string
  gateway?: string
  dns?: string
}

export interface Uiflow2NvsUpdate {
  wifi?: {
    ssid: string
    password: string
  }
  server?: string
}

export function buildUiflow2NvsCsv(config: Uiflow2NvsConfig): string {
  const merged = { ...UIFLOW2_NVS_DEFAULTS, ...config, ssid: config.ssid.trim() }
  return `key,type,encoding,value
uiflow,namespace,,
server,data,string,${merged.server}
boot_option,data,u8,${merged.bootOpt}
pswd0,data,string,${merged.pwd}
sntp0,data,string,${merged.sntp0}
ssid0,data,string,${merged.ssid}
tz,data,string,${merged.timezone}
net_mode,data,string,${merged.netMode}
protocol,data,string,${merged.protocol}
ip_addr,data,string,${merged.ipAddr}
netmask,data,string,${merged.netmask}
gateway,data,string,${merged.gateway}
dns,data,string,${merged.dns}`
}

export async function generateUiflow2NvsBin(config: Uiflow2NvsConfig): Promise<Uint8Array> {
  const csvText = buildUiflow2NvsCsv(config)
  const bin = await window.ipc.firmware.generateNvsFromCsv(csvText, UIFLOW2_NVS_PARTITION_SIZE)
  return bin instanceof Uint8Array ? bin : new Uint8Array(bin)
}

function setStringEntry(entries: EspNvsEntry[], key: string, value: string): void {
  const entry = entries.find((item) => item.key === key)
  if (entry) {
    if (entry.encoding !== 'string') {
      throw new Error(`NVS key '${key}' is not stored as text and cannot be updated safely.`)
    }
    entry.value = value
    return
  }
  entries.push({ key, encoding: 'string', value })
}

export async function generateUpdatedUiflow2NvsBin(
  currentPartition: Uint8Array,
  update: Uiflow2NvsUpdate
): Promise<Uint8Array> {
  const namespaces = parseEspNvsPartition(currentPartition)
  const uiflow = namespaces.find((namespace) => namespace.name === 'uiflow')
  if (!uiflow) throw new Error("The device NVS does not contain the expected 'uiflow' namespace.")

  if (update.wifi) {
    setStringEntry(uiflow.entries, 'ssid0', update.wifi.ssid)
    setStringEntry(uiflow.entries, 'pswd0', update.wifi.password)
  }
  if (update.server !== undefined) {
    setStringEntry(uiflow.entries, 'server', update.server)
  }

  const csvText = buildEspNvsCsv(namespaces)
  const bin = await window.ipc.firmware.generateNvsFromCsv(csvText, UIFLOW2_NVS_PARTITION_SIZE)
  return bin instanceof Uint8Array ? bin : new Uint8Array(bin)
}

export function verifyUiflow2NvsUpdate(partition: Uint8Array, update: Uiflow2NvsUpdate): void {
  const uiflow = parseEspNvsPartition(partition).find((namespace) => namespace.name === 'uiflow')
  if (!uiflow) throw new Error("Read-back NVS does not contain the expected 'uiflow' namespace.")

  const assertString = (key: string, expected: string): void => {
    const entry = uiflow.entries.find((item) => item.key === key)
    if (!entry || entry.encoding !== 'string' || entry.value !== expected) {
      throw new Error(`Read-back verification failed for NVS key '${key}'.`)
    }
  }

  if (update.wifi) {
    assertString('ssid0', update.wifi.ssid)
    assertString('pswd0', update.wifi.password)
  }
  if (update.server !== undefined) assertString('server', update.server)
}

export function mixinNvsIntoFirmware(firmware: Uint8Array, nvsBin: Uint8Array): Uint8Array {
  const minSize = UIFLOW2_NVS_OFFSET + UIFLOW2_NVS_PARTITION_SIZE
  if (firmware.byteLength < minSize) {
    throw new Error(
      `Firmware image is too small (${firmware.byteLength} bytes). ` +
        `Expected at least ${minSize} bytes for UIFlow2 NVS slot at 0x${UIFLOW2_NVS_OFFSET.toString(16)}.`
    )
  }
  if (nvsBin.byteLength !== UIFLOW2_NVS_PARTITION_SIZE) {
    throw new Error(
      `NVS binary size mismatch: got ${nvsBin.byteLength}, expected ${UIFLOW2_NVS_PARTITION_SIZE}.`
    )
  }

  const buffer0 = firmware.subarray(0, UIFLOW2_NVS_OFFSET)
  const buffer1 = nvsBin
  const buffer2 = firmware.subarray(UIFLOW2_NVS_OFFSET + UIFLOW2_NVS_PARTITION_SIZE)
  const merged = new Uint8Array(buffer0.byteLength + buffer1.byteLength + buffer2.byteLength)
  merged.set(buffer0, 0)
  merged.set(buffer1, buffer0.byteLength)
  merged.set(buffer2, buffer0.byteLength + buffer1.byteLength)
  return merged
}
