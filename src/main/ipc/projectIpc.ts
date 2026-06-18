import { ipcMain } from 'electron'
import type {
  ChatMessage,
  ChatMessageRunStatus,
  CreateProjectPayload,
  LegacyProjectPayload
} from '../../shared/types'
import type { ProjectService } from '../services/projectService'

export function registerProjectIpc(projectService: ProjectService): void {
  ;[
    'project:list',
    'project:create',
    'project:migrateFromLegacy',
    'project:rename',
    'project:delete',
    'project:listFiles',
    'project:readFile',
    'project:writeFile',
    'project:createFile',
    'project:importResourceFile',
    'project:readFileDataUrl',
    'project:deleteFile',
    'project:addConversation',
    'project:deleteConversation',
    'project:renameConversation',
    'project:appendConversationMessages',
    'project:setTurnDuration',
    'project:setTurnRunStatus',
    'project:setActiveDevice'
  ].forEach((channel) => ipcMain.removeHandler(channel))

  ipcMain.handle('project:list', () => projectService.listProjects())
  ipcMain.handle('project:create', (_event, payload: CreateProjectPayload) =>
    projectService.createProject(payload)
  )
  ipcMain.handle('project:migrateFromLegacy', (_event, payload: LegacyProjectPayload[]) =>
    projectService.migrateLegacyProjects(payload)
  )
  ipcMain.handle('project:rename', (_event, projectId: string, name: string) =>
    projectService.renameProject(projectId, name)
  )
  ipcMain.handle('project:delete', (_event, projectId: string) =>
    projectService.deleteProject(projectId)
  )
  ipcMain.handle('project:listFiles', (_event, projectId: string) =>
    projectService.listFiles(projectId)
  )
  ipcMain.handle('project:readFile', (_event, projectId: string, filePath: string) =>
    projectService.readProjectFile(projectId, filePath)
  )
  ipcMain.handle(
    'project:writeFile',
    (_event, projectId: string, filePath: string, content: string) =>
      projectService.writeProjectFile(projectId, filePath, content)
  )
  ipcMain.handle(
    'project:createFile',
    (_event, projectId: string, filePath: string, content?: string) =>
      projectService.createFile(projectId, filePath, content)
  )
  ipcMain.handle(
    'project:importResourceFile',
    (_event, projectId: string, filePath: string, base64Data: string) =>
      projectService.importResourceFile(projectId, filePath, base64Data)
  )
  ipcMain.handle('project:readFileDataUrl', (_event, projectId: string, filePath: string) =>
    projectService.readProjectFileDataUrl(projectId, filePath)
  )
  ipcMain.handle('project:deleteFile', (_event, projectId: string, filePath: string) =>
    projectService.deleteFile(projectId, filePath)
  )
  ipcMain.handle('project:addConversation', (_event, projectId: string) =>
    projectService.addConversation(projectId)
  )
  ipcMain.handle('project:deleteConversation', (_event, projectId: string, convId: string) =>
    projectService.deleteConversation(projectId, convId)
  )
  ipcMain.handle(
    'project:renameConversation',
    (_event, projectId: string, convId: string, title: string) =>
      projectService.renameConversation(projectId, convId, title)
  )
  ipcMain.handle(
    'project:appendConversationMessages',
    (_event, projectId: string, convId: string, messages: ChatMessage[]) =>
      projectService.appendConversationMessages(projectId, convId, messages)
  )
  ipcMain.handle(
    'project:setTurnDuration',
    (_event, projectId: string, convId: string, userMessageId: string, durationMs: number) =>
      projectService.setTurnDuration(projectId, convId, userMessageId, durationMs)
  )
  ipcMain.handle(
    'project:setTurnRunStatus',
    (
      _event,
      projectId: string,
      convId: string,
      userMessageId: string,
      runStatus: ChatMessageRunStatus
    ) => projectService.setTurnRunStatus(projectId, convId, userMessageId, runStatus)
  )
  ipcMain.handle('project:setActiveDevice', (_event, projectId: string, deviceId?: string) =>
    projectService.setActiveDevice(projectId, deviceId)
  )
}
