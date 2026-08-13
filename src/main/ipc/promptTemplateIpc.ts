import { ipcMain } from 'electron'
import type { CreatePromptTemplatePayload, UpdatePromptTemplatePayload } from '../../shared/types'
import type { ProjectService } from '../services/projectService'
import type { PromptTemplateService } from '../services/promptTemplateService'

export function registerPromptTemplateIpc(
  promptTemplateService: PromptTemplateService,
  projectService: ProjectService
): void {
  ipcMain.removeHandler('promptTemplate:list')
  ipcMain.removeHandler('promptTemplate:create')
  ipcMain.removeHandler('promptTemplate:update')
  ipcMain.removeHandler('promptTemplate:delete')

  ipcMain.handle('promptTemplate:list', () => promptTemplateService.listTemplates())
  ipcMain.handle('promptTemplate:create', (_event, payload: CreatePromptTemplatePayload) =>
    promptTemplateService.createTemplate(payload)
  )
  ipcMain.handle('promptTemplate:update', (_event, payload: UpdatePromptTemplatePayload) =>
    promptTemplateService.updateTemplate(payload)
  )
  ipcMain.handle('promptTemplate:delete', async (_event, templateId: string) => {
    await promptTemplateService.deleteTemplate(templateId)
    await projectService.clearPromptTemplateReferences(templateId)
  })
}
