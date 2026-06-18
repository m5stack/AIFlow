import type { BrowserWindow } from 'electron'
import { ipcMain } from 'electron'
import type {
  AgentActivityEvent,
  AgentErrorEvent,
  AgentFilesChangedEvent,
  AgentMessageEvent,
  AgentPermissionRequest,
  AgentPermissionResponse,
  AgentRewindParams,
  AgentStartTurnParams,
  AgentTurnCompleteEvent
} from '../../shared/types'
import { AgentService } from '../services/agentService'
import type { ProjectService } from '../services/projectService'
import type { UserModelService } from '../services/userModelService'

type AgentEventMap = {
  message: AgentMessageEvent
  activity: AgentActivityEvent
  permission: AgentPermissionRequest
  filesChanged: AgentFilesChangedEvent
  turnComplete: AgentTurnCompleteEvent
  error: AgentErrorEvent
}

const rendererChannel: Record<keyof AgentEventMap, string> = {
  message: 'agent:message',
  activity: 'agent:activity',
  permission: 'agent:permission',
  filesChanged: 'agent:filesChanged',
  turnComplete: 'agent:turnComplete',
  error: 'agent:error'
}

export function registerAgentIpc(
  mainWindow: BrowserWindow,
  projectService: ProjectService,
  userModelService: UserModelService
): AgentService {
  const agentService = new AgentService(projectService, userModelService, (channel, payload) => {
    if (!mainWindow.webContents.isDestroyed()) {
      mainWindow.webContents.send(rendererChannel[channel], payload)
    }
  })

  ipcMain.removeHandler('agent:startTurn')
  ipcMain.removeHandler('agent:respondPermission')
  ipcMain.removeHandler('agent:interrupt')
  ipcMain.removeHandler('agent:rewindFiles')

  ipcMain.handle('agent:startTurn', (_event, params: AgentStartTurnParams) => agentService.startTurn(params))
  ipcMain.handle('agent:respondPermission', (_event, response: AgentPermissionResponse) => {
    agentService.respondPermission(response)
  })
  ipcMain.handle('agent:interrupt', (_event, convId: string) => agentService.interrupt(convId))
  ipcMain.handle('agent:rewindFiles', (_event, params: AgentRewindParams) => agentService.rewindFiles(params))

  return agentService
}
