import { ipcMain } from 'electron'
import type { CreateUserModelConfigPayload, UpdateUserModelConfigPayload } from '../../shared/types'
import type { UserModelService } from '../services/userModelService'

export function registerModelIpc(userModelService: UserModelService): void {
  ;['model:list', 'model:create', 'model:update', 'model:delete'].forEach((channel) =>
    ipcMain.removeHandler(channel)
  )

  ipcMain.handle('model:list', () => userModelService.listModels())
  ipcMain.handle('model:create', (_event, payload: CreateUserModelConfigPayload) =>
    userModelService.createModel(payload)
  )
  ipcMain.handle('model:update', (_event, modelId: string, payload: UpdateUserModelConfigPayload) =>
    userModelService.updateModel(modelId, payload)
  )
  ipcMain.handle('model:delete', (_event, modelId: string) => userModelService.deleteModel(modelId))
}
