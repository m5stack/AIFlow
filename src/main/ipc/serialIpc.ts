import type { BrowserWindow } from 'electron'
import { ipcMain } from 'electron'
import type { SerialPortInfo } from '../../shared/types'

function isBluetoothSerialPort(port: SerialPortInfo): boolean {
  const text = [port.portName, port.displayName, port.manufacturerName]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return text.includes('bluetooth') || /\/rfcomm\d/i.test(port.portName)
}

function filterUsbSerialPorts(ports: SerialPortInfo[]): SerialPortInfo[] {
  return ports.filter((port) => !isBluetoothSerialPort(port))
}

let pendingSerialCallback: ((portId: string) => void) | null = null

function invokeSerialCallback(callback: (portId: string) => void, portId: string): void {
  try {
    callback(portId)
  } catch {
    // The Chromium serial chooser callback may already be invalidated
    // (e.g. window/dialog closed). Ignore to avoid crashing the main process.
  }
}

export function registerSerialPortSelectedIpc(): void {
  ipcMain.removeAllListeners('serial:port-selected')
  ipcMain.on('serial:port-selected', (_, portId: string) => {
    const callback = pendingSerialCallback
    pendingSerialCallback = null
    if (callback) {
      invokeSerialCallback(callback, portId)
    }
  })
}

export function registerSerialIpc(mainWindow: BrowserWindow): void {
  const { session } = mainWindow.webContents
  // The session is shared across the app, so a previous window's listener may
  // still be attached and reference a destroyed webContents. Remove it first.
  session.removeAllListeners('select-serial-port')

  session.on('select-serial-port', (event, portList, _webContents, callback) => {
    event.preventDefault()

    if (mainWindow.isDestroyed() || mainWindow.webContents.isDestroyed()) {
      invokeSerialCallback(callback, '')
      return
    }

    const usbPorts = filterUsbSerialPorts((portList ?? []) as SerialPortInfo[])
    if (usbPorts.length === 0) {
      invokeSerialCallback(callback, '')
      return
    }

    pendingSerialCallback = callback
    mainWindow.webContents.send('serial:port-list', usbPorts)
  })

  mainWindow.on('closed', () => {
    pendingSerialCallback = null
    session.removeAllListeners('select-serial-port')
  })
}
