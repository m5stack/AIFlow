import { DEVICE_TYPE, normalizeDeviceTypeForPinMap } from './deviceInfo'

export interface FirmwareSelectionEntry {
  id: string
  source: 'remote'
  version: string
  deviceType: string
  deviceLabel: string
  downloadUrl: string
}

export interface RemoteFirmwareApiItem {
  firmwareName?: unknown
  versionName?: unknown
  deviceType?: unknown
  downloadUrl?: unknown
}

const THIRD_PARTY_DEVICE_PATTERN = /\bFor\s+([^\]]+)\s*$/i
const FILTERED_COMPOSITE_DEVICE = 'core2tough'
const FIRMWARE_COLLATOR = new Intl.Collator('en', {
  numeric: true,
  sensitivity: 'base'
})

const DEVICE_LABELS: Record<string, string> = {
  atoms3: 'AtomS3',
  'atoms3-lite': 'AtomS3 Lite',
  atoms3u: 'AtomS3U',
  atoms3r: 'AtomS3R',
  'atoms3r-cam': 'AtomS3R Cam',
  'atom-echos3r': 'Atom EchoS3R',
  stamps3: 'StampS3',
  stamps3bat: 'StampS3 Bat',
  cores3: 'CoreS3',
  'stack-chan': 'StackChan',
  core2: 'Core2',
  tough: 'Tough',
  fire: 'Fire',
  basic: 'Core',
  'stickc-plus': 'StickC Plus',
  'stickc-plus2': 'StickC Plus2',
  capsule: 'Capsule',
  dial: 'Dial',
  cardputer: 'Cardputer',
  'cardputer-adv': 'Cardputer Adv',
  airq: 'AirQ',
  coreink: 'CoreInk',
  dinmeter: 'DinMeter',
  station: 'Station',
  paper: 'Paper',
  papers3: 'PaperS3',
  papercolor: 'PaperColor',
  papermono: 'PaperMono',
  stickc: 'StickC',
  stamppico: 'Stamp Pico',
  atomu: 'AtomU',
  atom: 'Atom Lite',
  'atom-matrix': 'Atom Matrix',
  'atom-echo': 'Atom Echo',
  stamplc: 'StamPLC',
  powerhub: 'PowerHub',
  dualkey: 'DualKey',
  'chain-dualkey': 'Chain DualKey',
  stopwatch: 'Stopwatch',
  nanoc6: 'NanoC6',
  tab5: 'Tab5',
  coremp135: 'CoreMP135',
  unitc6l: 'Unit-C6L',
  'unit-c6l': 'Unit-C6L',
  sticks3: 'StickS3',
  unitpoep4: 'Unit PoE P4',
  'unit-poep4': 'Unit PoE P4',
  stampp4: 'Stamp-P4',
  'stamp-c5': 'Stamp-C5'
}

const KNOWN_DEVICE_TYPES = new Set(Object.values(DEVICE_TYPE) as string[])

const normalizeCompositeDeviceType = (input: string): string =>
  input.toLowerCase().replace(/[^a-z0-9]+/g, '')

const isFilteredCompositeDevice = (...values: string[]): boolean =>
  values.some((value) => normalizeCompositeDeviceType(value) === FILTERED_COMPOSITE_DEVICE)

function normalizeFirmwareDeviceAlias(input: string): string {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
  if (normalized === 'esp32-s3-box3' || normalized === 'esp32s3-box3')
    return DEVICE_TYPE.ESP32S3_BOX3
  if (normalized === 'xiao-s3' || normalized === 'seeed-xiao-esp32s3') {
    return DEVICE_TYPE.SEEED_XIAO_ESP32S3
  }
  return normalized
}

function resolveFirmwareDeviceType(input: string): string | null {
  const normalized = normalizeFirmwareDeviceAlias(input)
  if (!normalized) return null
  if (normalized === 'stamp' || normalized === 'stamp-series') return DEVICE_TYPE.STAMP_PICO
  if (normalized === 'core') return DEVICE_TYPE.CORE
  if (normalized === 'atomlite') return DEVICE_TYPE.ATOM_LITE
  if (normalized === 'stampplc') return DEVICE_TYPE.STAMPLC
  if (normalized === 'nesson1') return DEVICE_TYPE.NESSO_N1
  if (normalized === 'seeedstudioxiaoesp32s3') return DEVICE_TYPE.SEEED_XIAO_ESP32S3
  if (normalized === 'xiaos3') return DEVICE_TYPE.SEEED_XIAO_ESP32S3
  return KNOWN_DEVICE_TYPES.has(normalized) ? normalized : null
}

function firmwareNameDeviceType(name: string): string | null {
  const bracketLabels = Array.from(
    name.matchAll(/\[([^\]]+)]/g),
    (match) => match[1]?.trim() ?? ''
  ).filter(Boolean)
  const forMatch = name.match(THIRD_PARTY_DEVICE_PATTERN)?.[1]?.trim() ?? ''
  const nameLabel = name
    .replace(/^\[third\s+party\]\s*/i, '')
    .replace(/^uiflow2(?:\.0)?(?:\s+for)?\s*/i, '')
    .replace(/\[[^\]]+\]/g, '')
    .trim()
  const candidates = [
    ...bracketLabels.reverse(),
    forMatch,
    nameLabel,
    nameLabel.replace(/^chain\s+/i, '')
  ]
  return candidates.map(resolveFirmwareDeviceType).find(Boolean) ?? null
}

export function normalizeFirmwareDeviceType(input: string): string {
  return normalizeDeviceTypeForPinMap(input)
}

export function getFirmwareDeviceLabel(deviceType: string, fallback?: string): string {
  const normalized = normalizeFirmwareDeviceType(deviceType)
  return DEVICE_LABELS[normalized] || fallback?.trim() || deviceType.trim() || 'Unknown device'
}

export function parseRemoteFirmwareItem(
  item: RemoteFirmwareApiItem,
  index: number
): FirmwareSelectionEntry | null {
  const rawVersion = typeof item.versionName === 'string' ? item.versionName.trim() : ''
  const downloadUrl = typeof item.downloadUrl === 'string' ? item.downloadUrl.trim() : ''
  if (!rawVersion || !downloadUrl) return null
  try {
    const url = new URL(downloadUrl)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  } catch {
    return null
  }

  let version = rawVersion
  let suffixDeviceType = ''
  if (/-hotfix$/i.test(rawVersion)) {
    suffixDeviceType = 'tough'
  } else {
    const versionMatch = rawVersion.match(/^(v?\d+(?:\.\d+)*)-(.+)$/i)
    const candidate = versionMatch?.[2]?.trim() ?? ''
    if (candidate && resolveFirmwareDeviceType(candidate)) {
      version = versionMatch?.[1]?.trim() ?? rawVersion
      suffixDeviceType = candidate
    }
  }

  const apiDeviceType = typeof item.deviceType === 'string' ? item.deviceType.trim() : ''
  const firmwareName = typeof item.firmwareName === 'string' ? item.firmwareName.trim() : ''
  const rawFirmwareNameDevice = firmwareName.match(THIRD_PARTY_DEVICE_PATTERN)?.[1]?.trim() ?? ''
  const firmwareNameDevice = firmwareNameDeviceType(firmwareName) ?? ''
  if (
    isFilteredCompositeDevice(
      apiDeviceType,
      rawFirmwareNameDevice,
      firmwareName,
      rawVersion,
      suffixDeviceType
    )
  ) {
    return null
  }
  const normalizedSuffix = suffixDeviceType
    ? (resolveFirmwareDeviceType(suffixDeviceType) ?? '')
    : ''
  const normalizedNameDevice = firmwareNameDevice
  const normalizedApi = apiDeviceType ? (resolveFirmwareDeviceType(apiDeviceType) ?? '') : ''
  const knownSuffix = KNOWN_DEVICE_TYPES.has(normalizedSuffix) ? normalizedSuffix : ''
  const knownNameDevice = KNOWN_DEVICE_TYPES.has(normalizedNameDevice) ? normalizedNameDevice : ''
  const knownApi = KNOWN_DEVICE_TYPES.has(normalizedApi) ? normalizedApi : ''
  const deviceType =
    knownNameDevice ||
    knownSuffix ||
    knownApi ||
    normalizedNameDevice ||
    suffixDeviceType ||
    apiDeviceType ||
    'unknown'
  if (deviceType === DEVICE_TYPE.CORE2 && version.replace(/^v/i, '') === '2.3.2') {
    return null
  }
  const deviceLabel = getFirmwareDeviceLabel(
    deviceType,
    firmwareNameDevice || apiDeviceType || suffixDeviceType
  )
  if (isFilteredCompositeDevice(deviceLabel)) return null
  const id = `remote:${index}:${rawVersion}:${deviceType}`

  return {
    id,
    source: 'remote',
    version,
    deviceType,
    deviceLabel,
    downloadUrl
  }
}

export function parseRemoteFirmwareList(payload: unknown): FirmwareSelectionEntry[] {
  const record = payload as Record<string, unknown> | null
  if (!record || record.code !== 200 || !Array.isArray(record.data)) {
    throw new Error(
      typeof record?.msg === 'string' && record.msg.trim()
        ? record.msg
        : 'Invalid firmware response.'
    )
  }
  return record.data
    .flatMap((item, index) => {
      if (!item || typeof item !== 'object') return []
      const parsed = parseRemoteFirmwareItem(item as RemoteFirmwareApiItem, index)
      return parsed ? [parsed] : []
    })
    .sort(
      (left, right) =>
        FIRMWARE_COLLATOR.compare(left.deviceLabel, right.deviceLabel) ||
        FIRMWARE_COLLATOR.compare(left.version, right.version)
    )
}
