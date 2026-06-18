export const DEVICE_TYPE = {
  ATOMS3: 'atoms3',
  ATOMS3_LITE: 'atoms3-lite',
  ATOMS3U: 'atoms3u',
  ATOMS3R: 'atoms3r',
  ATOMS3R_CAM: 'atoms3r-cam',
  ATOM_ECHO_S3R: 'atom-echos3r',
  STAMPS3: 'stamps3',
  STAMPS3BAT: 'stamps3bat',
  CORES3: 'cores3',
  STACKCHAN: 'stack-chan',
  CORE2: 'core2',
  TOUGH: 'tough',
  FIRE: 'fire',
  CORE: 'basic',
  STICKC_PLUS: 'stickc-plus',
  STICKC_PLUS2: 'stickc-plus2',
  CAPSULE: 'capsule',
  DIAL: 'dial',
  CARDPUTER: 'cardputer',
  CARDPUTER_ADV: 'cardputer-adv',
  AIRQ: 'airq',
  COREINK: 'coreink',
  DINMETER: 'dinmeter',
  STATION: 'station',
  PAPER: 'paper',
  PAPERS3: 'papers3',
  PAPER_COLOR: 'papercolor',
  STICKC: 'stickc',
  STAMP_PICO: 'stamppico',
  ATOMU: 'atomu',
  ATOM_LITE: 'atom',
  ATOM_MATRIX: 'atom-matrix',
  ATOM_ECHO: 'atom-echo',
  STAMPLC: 'stamplc',
  POWERHUB: 'powerhub',
  DUALKEY: 'dualkey',
  STOPWATCH: 'stopwatch',

  NANOC6: 'nanoc6',
  TAB5: 'tab5',
  COREMP135: 'coremp135',
  UNIT_C6L: 'unit-c6l',
  STICKS3: 'sticks3',
  UNIT_POE_P4: 'unit-poep4',
  STAMP_P4: 'stampp4',

  /* Third party */
  SEEED_XIAO_ESP32S3: 'seeed-xiao-esp32s3',
  ESP32S3_BOX3: 'esp32s3-box3',
  NESSO_N1: 'arduino-nesso-n1'
}

export const getPinMap = (deviceType: string) => {
  let pinMap = {}
  switch (deviceType) {
    case DEVICE_TYPE.ATOMS3:
    case DEVICE_TYPE.ATOMS3_LITE:
    case DEVICE_TYPE.ATOMS3U:
    case DEVICE_TYPE.ATOMS3R:
    case DEVICE_TYPE.ATOMS3R_CAM:
    case DEVICE_TYPE.ATOM_ECHO_S3R:
    case DEVICE_TYPE.CARDPUTER:
    case DEVICE_TYPE.CARDPUTER_ADV:
    case DEVICE_TYPE.NANOC6:
      pinMap = {
        portA: 'SCL:1,SDA:2'
      }
      break
    case DEVICE_TYPE.STAMPLC:
      pinMap = {
        portA: 'SCL:1,SDA:2',
        portC: 'SCL:4,SDA:5'
      }
      break
    case DEVICE_TYPE.ATOM_ECHO:
    case DEVICE_TYPE.ATOM_LITE:
    case DEVICE_TYPE.ATOM_MATRIX:
    case DEVICE_TYPE.ATOMU:
      pinMap = {
        portA: 'SCL:32,SDA:26'
      }
      break
    case DEVICE_TYPE.STAMPS3:
    case DEVICE_TYPE.CAPSULE:
    case DEVICE_TYPE.AIRQ:
      pinMap = {
        portA: 'SCL:15,SDA:13'
      }
      break
    case DEVICE_TYPE.STICKC:
    case DEVICE_TYPE.STICKC_PLUS:
    case DEVICE_TYPE.STICKC_PLUS2:
    case DEVICE_TYPE.COREINK:
    case DEVICE_TYPE.STAMP_PICO:
      pinMap = {
        portA: 'SCL:33,SDA:32'
      }
      break
    case DEVICE_TYPE.DIAL:
    case DEVICE_TYPE.DINMETER:
      pinMap = {
        portA: 'SCL:15,SDA:13',
        portB: 'SCL:1,SDA:2'
      }
      break
    case DEVICE_TYPE.CORE2:
    case DEVICE_TYPE.TOUGH:
      pinMap = {
        portA: 'SCL:33,SDA:32',
        portB: 'SCL:36,SDA:26',
        portC: 'SCL:13,SDA:14'
      }
      break
    case DEVICE_TYPE.CORES3:
    case DEVICE_TYPE.STACKCHAN:
      pinMap = {
        portA: 'SCL:1,SDA:2',
        portB: 'SCL:8,SDA:9',
        portC: 'SCL:18,SDA:17'
      }
      break
    case DEVICE_TYPE.COREMP135:
      pinMap = {
        portA: 'SCL:11,SDA:3',
        portC: 'SCL:6,SDA:7'
      }
      break
    case DEVICE_TYPE.PAPER:
      pinMap = {
        portA: 'SCL:32,SDA:25',
        portB: 'SCL:33,SDA:26',
        portC: 'SCL:19,SDA:18'
      }
      break
    case DEVICE_TYPE.PAPERS3:
      pinMap = {
        portA: 'SCL:2,SDA:1'
      }
      break
    case DEVICE_TYPE.STATION:
      pinMap = {
        portA1: 'SCL:33,SDA:32',
        portA2: 'SCL:33,SDA:32',
        portB1: 'SCL:35,SDA:25',
        portB2: 'SCL:36,SDA:26',
        portC1: 'SCL:13,SDA:14',
        portC2: 'SCL:16,SDA:17'
      }
      break
    case DEVICE_TYPE.TAB5:
    case DEVICE_TYPE.UNIT_POE_P4:
      pinMap = {
        portA: 'SCL:54,SDA:53'
      }
      break
    case DEVICE_TYPE.UNIT_C6L:
    case DEVICE_TYPE.NESSO_N1:
      pinMap = {
        portA: 'SCL:4,SDA:5'
      }
      break
    case DEVICE_TYPE.STOPWATCH:
      pinMap = {
        portA: 'SCL:11,SDA:10'
      }
      break
    case DEVICE_TYPE.PAPER_COLOR:
      pinMap = {
        portA: 'SCL:5,SDA:4'
      }
      break
    case DEVICE_TYPE.POWERHUB:
      pinMap = {
        portA: 'SCL:16,SDA:15',
        portC: 'SCL:2,SDA:1'
      }
      break
    case DEVICE_TYPE.DUALKEY:
      pinMap = {
        port1: 'SCL:47,SDA:48',
        port2: 'SCL:5,SDA:6'
      }
      break
    case DEVICE_TYPE.STICKS3:
      pinMap = {
        portA: 'SCL:10,SDA:9'
      }
      break
    case DEVICE_TYPE.STAMPS3BAT:
      pinMap = {
        portA: 'SCL:7,SDA:6'
      }
      break
    case DEVICE_TYPE.STAMP_P4:
      pinMap = {
        portA: 'SCL:26,SDA:27'
      }
      break
    default:
      /** Core/fire */
      pinMap = {
        portA: 'SCL:22,SDA:21',
        portB: 'SCL:36,SDA:26',
        portC: 'SCL:16,SDA:17'
      }
  }
  return pinMap
}

export const getHatPinMap = (type: string) => {
  switch (type) {
    case DEVICE_TYPE.STICKC:
    case DEVICE_TYPE.STICKC_PLUS:
    case DEVICE_TYPE.STICKC_PLUS2:
      return { Hat: 'SCL:26,SDA:0' }
    case DEVICE_TYPE.COREINK:
      return { Hat: 'SCL:26,SDA:25' }
    case DEVICE_TYPE.NESSO_N1:
      return { Hat: 'SCL:7,SDA:6' }
    case DEVICE_TYPE.STICKS3:
      return { Hat: 'SCL:0,SDA:8' }
    case DEVICE_TYPE.UNIT_POE_P4:
      return { Hat: 'SCL:21,SDA:19' }
    default:
      return { Hat: '' }
  }
}

export const getBasePinMap = (deviceType: string) => {
  let pinMap = {}
  switch (deviceType) {
    case DEVICE_TYPE.ATOM_ECHO:
    case DEVICE_TYPE.ATOM_LITE:
    case DEVICE_TYPE.ATOM_MATRIX:
      pinMap = {
        Base: 'SCL:21,SDA:25'
      }
      break
    case DEVICE_TYPE.ATOMS3:
    case DEVICE_TYPE.ATOMS3_LITE:
    case DEVICE_TYPE.ATOMS3R:
    case DEVICE_TYPE.ATOMS3R_CAM:
      pinMap = {
        Base: 'SCL:39,SDA:38'
      }
      break
    default:
      pinMap = {
        Base: ''
      }
  }
  return pinMap
}

export type DeviceScreenSize = { width: number; height: number }

export const getScreenSize = (deviceType: string): DeviceScreenSize => {
  switch (deviceType) {
    case DEVICE_TYPE.ATOMS3:
    case DEVICE_TYPE.ATOMS3_LITE:
    case DEVICE_TYPE.ATOMS3R:
    case DEVICE_TYPE.ATOMS3R_CAM:
      return { width: 128, height: 128 }
    case DEVICE_TYPE.STICKC:
      return { width: 80, height: 160 }
    case DEVICE_TYPE.STICKC_PLUS:
    case DEVICE_TYPE.STICKC_PLUS2:
    case DEVICE_TYPE.STICKS3:
    case DEVICE_TYPE.DINMETER:
    case DEVICE_TYPE.STAMPLC:
    case DEVICE_TYPE.NESSO_N1:
      return { width: 135, height: 240 }
    case DEVICE_TYPE.COREINK:
    case DEVICE_TYPE.AIRQ:
      return { width: 200, height: 200 }
    case DEVICE_TYPE.STATION:
    case DEVICE_TYPE.CARDPUTER:
    case DEVICE_TYPE.CARDPUTER_ADV:
      return { width: 240, height: 135 }
    case DEVICE_TYPE.DIAL:
      return { width: 240, height: 240 }
    case DEVICE_TYPE.PAPER:
    case DEVICE_TYPE.PAPERS3:
      return { width: 960, height: 540 }
    case DEVICE_TYPE.PAPER_COLOR:
      return { width: 400, height: 600 }
    case DEVICE_TYPE.STOPWATCH:
      return { width: 468, height: 468 }
    case DEVICE_TYPE.TAB5:
      return { width: 720, height: 1280 }
    case DEVICE_TYPE.COREMP135:
      return { width: 320, height: 240 }
    case DEVICE_TYPE.UNIT_C6L:
      return { width: 64, height: 48 }
    case DEVICE_TYPE.CORE:
    case DEVICE_TYPE.FIRE:
    case DEVICE_TYPE.CORE2:
    case DEVICE_TYPE.TOUGH:
    case DEVICE_TYPE.CORES3:
    case DEVICE_TYPE.STACKCHAN:
      return { width: 320, height: 240 }
    case DEVICE_TYPE.ATOMS3U:
    case DEVICE_TYPE.ATOM_ECHO_S3R:
    case DEVICE_TYPE.STAMPS3:
    case DEVICE_TYPE.STAMPS3BAT:
    case DEVICE_TYPE.STAMP_PICO:
    case DEVICE_TYPE.STAMP_P4:
    case DEVICE_TYPE.ATOM_LITE:
    case DEVICE_TYPE.ATOM_MATRIX:
    case DEVICE_TYPE.ATOM_ECHO:
    case DEVICE_TYPE.ATOMU:
    case DEVICE_TYPE.CAPSULE:
    case DEVICE_TYPE.POWERHUB:
    case DEVICE_TYPE.DUALKEY:
    case DEVICE_TYPE.NANOC6:
    case DEVICE_TYPE.UNIT_POE_P4:
    case DEVICE_TYPE.SEEED_XIAO_ESP32S3:
      return { width: 0, height: 0 }
    case DEVICE_TYPE.ESP32S3_BOX3:
      return { width: 320, height: 240 }
    default:
      return { width: 320, height: 240 }
  }
}

/** Map UI model/name (e.g. AtomS3R) to `DEVICE_TYPE` keys used by pin maps. */
export function normalizeDeviceTypeForPinMap(input: string): string {
  const s = input.trim().toLowerCase().replace(/\s+/g, '')
  const all = Object.values(DEVICE_TYPE) as string[]
  if (all.includes(s)) return s
  const compact = s.replace(/-/g, '')
  for (const v of all) {
    if (v.replace(/-/g, '') === compact) return v
  }
  return s
}

/** Text block for LLM: port pins + Hat + Base I2C + screen size for this hardware type (API-only). */
export function formatPinMapsForPrompt(deviceTypeKey: string): string {
  const port = getPinMap(deviceTypeKey)
  const hat = getHatPinMap(deviceTypeKey)
  const base = getBasePinMap(deviceTypeKey)
  const { width, height } = getScreenSize(deviceTypeKey)
  const merged: Record<string, string> = {
    ...(port as Record<string, string>),
    ...(hat as Record<string, string>),
    ...(base as Record<string, string>)
  }
  const lines = Object.entries(merged).map(([k, v]) => `  ${k}: ${v}`)
  const screen =
    width > 0 && height > 0 ? `  screen: ${width}x${height}` : '  screen: (no built-in display)'
  return `Device pin map:\n${lines.join('\n')}\n${screen}`
}
