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
  ;['skill:list', 'skill:add', 'skill:delete', 'skill:open'].forEach((channel) =>
    ipcMain.removeHandler(channel)
  )

  ipcMain.handle('skill:list', () => skillService.listSkills())
  ipcMain.handle('skill:add', async () => {
    const before = await skillService.listSkills()
    const skills = await skillService.addSkillFromFolder(mainWindow)
    if (skills.length !== before.length) {
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
}
