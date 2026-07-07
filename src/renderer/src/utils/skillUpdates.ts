import type { SkillItem } from '../../../shared/types'
import { isRemoteSkillNewer, parseSkillFileName } from '../../../shared/skillVersion'
import type { SkillItem as RemoteSkillItem } from '../api/skill'

export type SkillUpdateInfo = {
  slug: string
  remoteFileName: string
  remoteVersion: string
  installedVersion: string
  expectedSize?: number
}

export function findUpdateForSkill(
  skill: SkillItem,
  remoteSkills: RemoteSkillItem[]
): SkillUpdateInfo | null {
  const { base, version: installedVersion } = parseSkillFileName(skill.slug)
  let bestRemote: RemoteSkillItem | null = null
  let bestVersion = ''

  for (const remote of remoteSkills) {
    const { base: remoteBase, version: remoteVersion } = parseSkillFileName(remote.fileName)
    if (remoteBase !== base) continue
    if (!isRemoteSkillNewer(remoteVersion, installedVersion)) continue
    if (!bestRemote || isRemoteSkillNewer(remoteVersion, bestVersion)) {
      bestRemote = remote
      bestVersion = remoteVersion
    }
  }

  if (!bestRemote) return null

  return {
    slug: skill.slug,
    remoteFileName: bestRemote.fileName,
    remoteVersion: bestVersion,
    installedVersion,
    expectedSize: bestRemote.size
  }
}

export function findSkillUpdates(
  installedSkills: SkillItem[],
  remoteSkills: RemoteSkillItem[]
): Map<string, SkillUpdateInfo> {
  const updates = new Map<string, SkillUpdateInfo>()
  for (const skill of installedSkills) {
    const update = findUpdateForSkill(skill, remoteSkills)
    if (update) updates.set(skill.slug, update)
  }
  return updates
}
