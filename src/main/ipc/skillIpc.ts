import type { BrowserWindow } from 'electron'
import { ipcMain } from 'electron'
import type { SkillItem } from '../../shared/types'
import type { ProjectService } from '../services/projectService'
import type { SkillService } from '../services/skillService'

export function registerSkillIpc(
  mainWindow: BrowserWindow,
  skillService: SkillService,
  projectService: ProjectService
): void {
  ;['skill:list', 'skill:add', 'skill:delete', 'skill:open', 'skill:install'].forEach((channel) =>
    ipcMain.removeHandler(channel)
  )

  ipcMain.handle('skill:list', () => skillService.listSkills())
  ipcMain.handle('skill:add', async () => {
    const { skills, imported } = await skillService.addSkill(mainWindow)
    if (imported) {
      await projectService.applySkillsChange()
    }
    return skills
  })
  ipcMain.handle('skill:delete', async (_event, slug: string): Promise<SkillItem[]> => {
    const skills = await skillService.deleteUserSkill(slug)
    await projectService.applySkillsChange()
    return skills
  })
  ipcMain.handle('skill:open', (_event, slug: string) => skillService.openSkillDirectory(slug))
  ipcMain.handle(
    'skill:install',
    async (_event, fileName: string, data: Uint8Array): Promise<SkillItem[]> => {
      const skills = await skillService.installSkillFromZip(fileName, Buffer.from(data))
      await projectService.applySkillsChange()
      return skills
    }
  )
}
