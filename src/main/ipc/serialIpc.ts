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

export function registerSerialPortSelectedIpc(): void {
  ipcMain.removeAllListeners('serial:port-selected')
  ipcMain.on('serial:port-selected', (_, portId: string) => {
    if (pendingSerialCallback) {
      pendingSerialCallback(portId)
      pendingSerialCallback = null
    }
  })
}

export function registerSerialIpc(mainWindow: BrowserWindow): void {
  mainWindow.webContents.session.on(
    'select-serial-port',
    (event, portList, _webContents, callback) => {
      event.preventDefault()
      const usbPorts = filterUsbSerialPorts((portList ?? []) as SerialPortInfo[])
      if (usbPorts.length === 0) {
        callback('')
      } else {
        pendingSerialCallback = callback
        mainWindow.webContents.send('serial:port-list', usbPorts)
      }
    }
  )
}
