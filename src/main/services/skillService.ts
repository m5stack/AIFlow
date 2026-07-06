import { app, dialog, shell, type BrowserWindow } from 'electron'
import { cp, lstat, mkdir, readFile, readdir, readlink, rm, stat, symlink } from 'fs/promises'
import { realpathSync } from 'fs'
import { basename, dirname, isAbsolute, join, relative, resolve } from 'path'
import type { SkillItem } from '../../shared/types'

const BUNDLED_SKILLS_DIR_NAME = 'skills'
const USER_SKILLS_DIR_NAME = 'skills'
const SKILL_FILE_NAME = 'SKILL.md'

type SkillSource = {
  slug: string
  sourcePath: string
  builtin: boolean
}

type SkillFrontmatter = {
  name?: string
  description?: string
}

const isPathInside = (basePath: string, candidatePath: string): boolean => {
  const rel = relative(basePath, candidatePath)
  return rel === '' || (!!rel && !rel.startsWith('..') && !isAbsolute(rel))
}

const canonicalizePath = (targetPath: string): string => {
  try {
    return realpathSync(resolve(targetPath))
  } catch {
    return resolve(targetPath)
  }
}

const sanitizeSlug = (value: string): string => {
  const trimmed = value.trim().toLowerCase()
  const sanitized = trimmed.replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '')
  return sanitized || 'skill'
}

const parseSkillFrontmatter = (raw: string): SkillFrontmatter => {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return {}

  const frontmatter: SkillFrontmatter = {}
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(':')
    if (separator === -1) continue
    const key = line.slice(0, separator).trim()
    const value = line.slice(separator + 1).trim()
    if (key === 'name') frontmatter.name = value
    if (key === 'description') frontmatter.description = value
  }
  return frontmatter
}

const formatSkillName = (slug: string): string =>
  slug
    .split(/[-_.]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

export class SkillService {
  private readonly userSkillsDir: string

  constructor(userSkillsDir = join(app.getPath('userData'), USER_SKILLS_DIR_NAME)) {
    this.userSkillsDir = userSkillsDir
  }

  getBundledSkillsRoot(): string {
    return canonicalizePath(this.bundledSkillsRoot())
  }

  getUserSkillsRoot(): string {
    return canonicalizePath(this.userSkillsDir)
  }

  getSkillAdditionalDirectories(): string[] {
    return [this.getBundledSkillsRoot(), this.getUserSkillsRoot()]
  }

  async listSkills(): Promise<SkillItem[]> {
    const [bundled, user] = await Promise.all([
      this.scanSkillRoot(this.getBundledSkillsRoot(), true),
      this.scanSkillRoot(this.getUserSkillsRoot(), false)
    ])
    return [...bundled, ...user].sort((a, b) => {
      if (a.builtin !== b.builtin) return a.builtin ? -1 : 1
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    })
  }

  async addSkillFromFolder(parentWindow: BrowserWindow): Promise<SkillItem[]> {
    const result = await dialog.showOpenDialog(parentWindow, {
      title: 'Import Skill Folder',
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) {
      return this.listSkills()
    }

    const sourceDir = result.filePaths[0]
    const skillFilePath = join(sourceDir, SKILL_FILE_NAME)
    try {
      await stat(skillFilePath)
    } catch {
      throw new Error(`Selected folder must contain ${SKILL_FILE_NAME}.`)
    }

    const frontmatter = parseSkillFrontmatter(await readFile(skillFilePath, 'utf8'))
    const baseSlug = sanitizeSlug(frontmatter.name || basename(sourceDir))
    const destDir = await this.resolveUniqueUserSkillDir(baseSlug)

    await mkdir(this.userSkillsDir, { recursive: true })
    await cp(sourceDir, destDir, { recursive: true })
    return this.listSkills()
  }

  async deleteUserSkill(slug: string): Promise<SkillItem[]> {
    if (!slug || slug.includes('/') || slug.includes('\\') || slug.includes('\0')) {
      throw new Error('Invalid skill id.')
    }

    const targetDir = join(this.getUserSkillsRoot(), slug)
    if (!isPathInside(this.getUserSkillsRoot(), resolve(targetDir))) {
      throw new Error('Invalid skill path.')
    }

    const bundledSlugs = new Set(
      (await this.scanSkillRoot(this.getBundledSkillsRoot(), true)).map((skill) => skill.slug)
    )
    if (bundledSlugs.has(slug)) {
      throw new Error('Built-in skills cannot be deleted.')
    }

    try {
      await stat(targetDir)
    } catch {
      throw new Error('Skill not found.')
    }

    await rm(targetDir, { recursive: true, force: true })
    return this.listSkills()
  }

  async openSkillDirectory(slug: string): Promise<void> {
    const dir = await this.resolveSkillDirectory(slug)
    const result = await shell.openPath(dir)
    if (result) {
      throw new Error(result)
    }
  }

  async reconcileProjectSkills(filesRoot: string): Promise<void> {
    const claudeDir = join(filesRoot, '.claude')
    const skillsDir = join(claudeDir, 'skills')
    const linkType = process.platform === 'win32' ? 'junction' : 'dir'
    const sources = await this.collectSkillSources()
    const expectedSlugs = new Set(sources.map((source) => source.slug))

    await mkdir(claudeDir, { recursive: true })

    try {
      const entry = await lstat(skillsDir)
      if (entry.isSymbolicLink()) {
        await rm(skillsDir)
        await mkdir(skillsDir, { recursive: true })
      } else if (!entry.isDirectory()) {
        await rm(skillsDir, { recursive: true, force: true })
        await mkdir(skillsDir, { recursive: true })
      }
    } catch {
      await mkdir(skillsDir, { recursive: true })
    }

    for (const source of sources) {
      const linkPath = join(skillsDir, source.slug)
      const canonicalSource = canonicalizePath(source.sourcePath)
      let needsLink = true

      try {
        const entry = await lstat(linkPath)
        if (entry.isSymbolicLink()) {
          const linkedTarget = await readlink(linkPath)
          const resolvedTarget = canonicalizePath(resolve(dirname(linkPath), linkedTarget))
          needsLink = resolvedTarget !== canonicalSource
          if (needsLink) await rm(linkPath)
        } else {
          await rm(linkPath, { recursive: true, force: true })
        }
      } catch {
        // link does not exist yet
      }

      if (needsLink) {
        await symlink(source.sourcePath, linkPath, linkType)
      }
    }

    const entries = await readdir(skillsDir, { withFileTypes: true })
    await Promise.all(
      entries.map(async (entry) => {
        if (expectedSlugs.has(entry.name)) return
        const entryPath = join(skillsDir, entry.name)
        try {
          const entryStat = await lstat(entryPath)
          if (entryStat.isSymbolicLink()) {
            await rm(entryPath)
          }
        } catch {
          // ignore cleanup failures
        }
      })
    )
  }

  isSkillPath(filePath: string): boolean {
    if (!filePath || filePath.includes('\0')) return false

    const roots = this.getSkillAdditionalDirectories()
    const resolved = isAbsolute(filePath) ? resolve(filePath) : resolve(roots[0], filePath)
    let absPath = resolved
    try {
      absPath = realpathSync(resolved)
    } catch {
      // Path may not exist yet; fall back to lexical resolution.
    }

    return roots.some((root) => isPathInside(root, absPath))
  }

  private bundledSkillsRoot(): string {
    return app.isPackaged
      ? join(process.resourcesPath, BUNDLED_SKILLS_DIR_NAME)
      : join(process.cwd(), 'resources', BUNDLED_SKILLS_DIR_NAME)
  }

  private async resolveSkillDirectory(slug: string): Promise<string> {
    if (!slug || slug.includes('/') || slug.includes('\\') || slug.includes('\0')) {
      throw new Error('Invalid skill id.')
    }

    const candidates = [
      join(this.getBundledSkillsRoot(), slug),
      join(this.getUserSkillsRoot(), slug)
    ]

    for (const candidate of candidates) {
      try {
        await stat(join(candidate, SKILL_FILE_NAME))
        return canonicalizePath(candidate)
      } catch {
        // try next location
      }
    }

    throw new Error('Skill not found.')
  }

  private async resolveUniqueUserSkillDir(baseSlug: string): Promise<string> {
    let slug = baseSlug
    let suffix = 2
    while (true) {
      const candidate = join(this.userSkillsDir, slug)
      try {
        await stat(candidate)
        slug = `${baseSlug}-${suffix}`
        suffix += 1
      } catch {
        return candidate
      }
    }
  }

  private async collectSkillSources(): Promise<SkillSource[]> {
    const [bundled, user] = await Promise.all([
      this.scanSkillRoot(this.getBundledSkillsRoot(), true),
      this.scanSkillRoot(this.getUserSkillsRoot(), false)
    ])
    return [...bundled, ...user].map((skill) => ({
      slug: skill.slug,
      sourcePath: skill.sourcePath,
      builtin: skill.builtin
    }))
  }

  private async scanSkillRoot(
    rootPath: string,
    builtin: boolean
  ): Promise<Array<SkillItem & { sourcePath: string }>> {
    let entries
    try {
      entries = await readdir(rootPath, { withFileTypes: true })
    } catch {
      return []
    }

    const skills: Array<SkillItem & { sourcePath: string }> = []
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue

      const sourcePath = join(rootPath, entry.name)
      const skillFilePath = join(sourcePath, SKILL_FILE_NAME)
      try {
        await stat(skillFilePath)
      } catch {
        continue
      }

      const frontmatter = parseSkillFrontmatter(await readFile(skillFilePath, 'utf8'))
      skills.push({
        slug: entry.name,
        name: frontmatter.name?.trim() || formatSkillName(entry.name),
        description: frontmatter.description?.trim() || undefined,
        builtin,
        sourcePath
      })
    }

    return skills
  }
}
