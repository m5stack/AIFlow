import { ipcMain } from 'electron'
import type { ClientIdService } from '../services/clientIdService'

export function registerClientIdIpc(clientIdService: ClientIdService): void {
  ;['clientId:get', 'clientId:set'].forEach((channel) => ipcMain.removeHandler(channel))

  ipcMain.handle('clientId:get', () => clientIdService.get())
  ipcMain.handle('clientId:set', (_event, clientId: string) => clientIdService.set(clientId))
}
