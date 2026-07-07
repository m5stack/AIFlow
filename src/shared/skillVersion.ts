export type SkillFileIdentity = {
  base: string
  version: string
}

const SKILL_FILE_NAME_PATTERN = /^(.+)-(\d+(?:\.\d+)*)$/

/** Parse base name and version from a skill folder name or zip file name. */
export function parseSkillFileName(nameOrFileName: string): SkillFileIdentity {
  const withoutExt = nameOrFileName.replace(/\.zip$/i, '')
  const match = withoutExt.match(SKILL_FILE_NAME_PATTERN)
  if (!match) {
    return { base: withoutExt, version: '' }
  }
  return { base: match[1], version: match[2] }
}

/** Compare dotted numeric versions. Returns >0 if a is newer, <0 if b is newer, 0 if equal. */
export function compareVersions(a: string, b: string): number {
  if (!a && !b) return 0
  if (!a) return -1
  if (!b) return 1

  const aParts = a.split('.').map((part) => Number.parseInt(part, 10) || 0)
  const bParts = b.split('.').map((part) => Number.parseInt(part, 10) || 0)
  const length = Math.max(aParts.length, bParts.length)

  for (let index = 0; index < length; index += 1) {
    const aValue = aParts[index] ?? 0
    const bValue = bParts[index] ?? 0
    if (aValue > bValue) return 1
    if (aValue < bValue) return -1
  }

  return 0
}

export function isRemoteSkillNewer(remoteVersion: string, installedVersion: string): boolean {
  return compareVersions(remoteVersion, installedVersion) > 0
}
