import { ipcMain } from 'electron'
import type { TokenUsageService } from '../services/tokenUsageService'

export function registerTokenUsageIpc(tokenUsageService: TokenUsageService): void {
  ;['tokenUsage:getStats'].forEach((channel) => ipcMain.removeHandler(channel))

  ipcMain.handle('tokenUsage:getStats', () => tokenUsageService.getStats())
}
