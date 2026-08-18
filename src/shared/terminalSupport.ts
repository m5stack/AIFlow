import { DEVICE_TYPE, normalizeDeviceTypeForPinMap } from './deviceInfo'

export interface TerminalSupportedDevice {
  type: string
  label: string
}

export const TERMINAL_SUPPORTED_DEVICES = [
  { type: DEVICE_TYPE.AIRQ, label: 'AirQ' },
  { type: DEVICE_TYPE.ATOMS3, label: 'AtomS3' },
  { type: DEVICE_TYPE.ATOMS3R, label: 'AtomS3R' },
  { type: DEVICE_TYPE.CARDPUTER_ADV, label: 'Cardputer-Adv' },
  { type: DEVICE_TYPE.CORES3, label: 'CoreS3' },
  { type: DEVICE_TYPE.DIAL, label: 'Dial' },
  { type: DEVICE_TYPE.PAPER_MONO, label: 'PaperMono' },
  { type: DEVICE_TYPE.PAPERS3, label: 'PaperS3' },
  { type: DEVICE_TYPE.STACKCHAN, label: 'StackChan' },
  { type: DEVICE_TYPE.STAMPLC, label: 'StamPLC' },
  { type: DEVICE_TYPE.STICKS3, label: 'StickS3' },
  { type: DEVICE_TYPE.STOPWATCH, label: 'StopWatch' },
  { type: DEVICE_TYPE.TAB5, label: 'Tab5' }
] as const satisfies readonly TerminalSupportedDevice[]

const TERMINAL_SUPPORTED_DEVICE_TYPES = new Set<string>(
  TERMINAL_SUPPORTED_DEVICES.map((device) => device.type)
)

export function isTerminalSupportedDevice(deviceType: string): boolean {
  return TERMINAL_SUPPORTED_DEVICE_TYPES.has(normalizeDeviceTypeForPinMap(deviceType))
}
