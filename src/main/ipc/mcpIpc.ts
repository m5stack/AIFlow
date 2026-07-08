import { ipcMain } from 'electron'
import type { CreateMcpServerPayload, UpdateMcpServerPayload } from '../../shared/types'
import type { McpService } from '../services/mcpService'

export function registerMcpIpc(mcpService: McpService): void {
  ;['mcp:list', 'mcp:create', 'mcp:update', 'mcp:delete'].forEach((channel) =>
    ipcMain.removeHandler(channel)
  )

  ipcMain.handle('mcp:list', () => mcpService.listServers())
  ipcMain.handle('mcp:create', (_event, payload: CreateMcpServerPayload) =>
    mcpService.createServer(payload)
  )
  ipcMain.handle('mcp:update', (_event, payload: UpdateMcpServerPayload) =>
    mcpService.updateServer(payload)
  )
  ipcMain.handle('mcp:delete', (_event, serverId: string) => mcpService.deleteServer(serverId))
}
