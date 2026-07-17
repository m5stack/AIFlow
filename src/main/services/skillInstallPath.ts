import { basename, isAbsolute, relative, resolve } from 'path'

const INVALID_SKILL_PACKAGE_NAME = 'Invalid skill package name.'

const isPathInside = (basePath: string, candidatePath: string): boolean => {
  const rel = relative(basePath, candidatePath)
  return !!rel && !rel.startsWith('..') && !isAbsolute(rel)
}

export type SkillInstallTarget = {
  slug: string
  destDir: string
}

export function resolveSkillInstallTarget(
  userSkillsRoot: string,
  fileName: string
): SkillInstallTarget {
  const normalizedFileName = fileName.trim()
  if (
    !normalizedFileName ||
    normalizedFileName.includes('\0') ||
    normalizedFileName.includes('/') ||
    normalizedFileName.includes('\\') ||
    basename(normalizedFileName) !== normalizedFileName ||
    !normalizedFileName.toLowerCase().endsWith('.zip')
  ) {
    throw new Error(INVALID_SKILL_PACKAGE_NAME)
  }

  const slug = normalizedFileName.slice(0, -'.zip'.length)
  if (!slug || slug === '.' || slug === '..') {
    throw new Error(INVALID_SKILL_PACKAGE_NAME)
  }

  const skillsRoot = resolve(userSkillsRoot)
  const destDir = resolve(skillsRoot, slug)
  if (!isPathInside(skillsRoot, destDir)) {
    throw new Error(INVALID_SKILL_PACKAGE_NAME)
  }

  return { slug, destDir }
}
