import { app, dialog, shell, type BrowserWindow } from 'electron'
import AdmZip from 'adm-zip'
import {
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  readlink,
  rm,
  stat,
  symlink
} from 'fs/promises'
import { realpathSync } from 'fs'
import { basename, dirname, isAbsolute, join, relative, resolve } from 'path'
import { tmpdir } from 'os'
import { parseSkillFileName } from '../../shared/skillVersion'
import { resolveSkillDisplayName } from '../../shared/skillDisplay'
import type { SkillItem } from '../../shared/types'
import { resolveSkillInstallTarget } from './skillInstallPath'

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
    const value = line
      .slice(separator + 1)
      .trim()
      .replace(/^["']|["']$/g, '')
    if (key === 'name') frontmatter.name = value
    if (key === 'description') frontmatter.description = value
  }
  return frontmatter
}

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
    const shadowed = this.applyBuiltinShadowing(bundled, user)
    return shadowed.sort((a, b) => {
      if (a.builtin !== b.builtin) return a.builtin ? -1 : 1
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    })
  }

  async installSkillFromZip(fileName: string, data: Buffer): Promise<SkillItem[]> {
    const { slug, destDir } = resolveSkillInstallTarget(this.getUserSkillsRoot(), fileName)
    const { base: targetBase } = parseSkillFileName(slug)
    const tempDir = await mkdtemp(join(tmpdir(), 'aiflow-skill-'))

    try {
      const zip = new AdmZip(data)
      zip.extractAllTo(tempDir, true)

      const skillRoot = await this.resolveExtractedSkillRoot(tempDir)

      await mkdir(this.userSkillsDir, { recursive: true })
      await this.removeUserSkillsByBase(targetBase, slug)
      await rm(destDir, { recursive: true, force: true })
      await cp(skillRoot, destDir, { recursive: true })
    } finally {
      await rm(tempDir, { recursive: true, force: true })
    }

    return this.listSkills()
  }

  async addSkill(parentWindow: BrowserWindow): Promise<{ skills: SkillItem[]; imported: boolean }> {
    const result = await dialog.showOpenDialog(parentWindow, {
      title: 'Import Skill',
      properties: ['openFile', 'openDirectory'],
      filters: [{ name: 'Skill Package', extensions: ['zip'] }]
    })
    if (result.canceled || result.filePaths.length === 0) {
      return { skills: await this.listSkills(), imported: false }
    }

    const selectedPath = result.filePaths[0]
    if (selectedPath.toLowerCase().endsWith('.zip')) {
      const data = await readFile(selectedPath)
      const skills = await this.installSkillFromZip(basename(selectedPath), data)
      return { skills, imported: true }
    }

    const sourceDir = selectedPath
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
    return { skills: await this.listSkills(), imported: true }
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
    return this.applyBuiltinShadowing(bundled, user).map((skill) => ({
      slug: skill.slug,
      sourcePath: skill.sourcePath,
      builtin: skill.builtin
    }))
  }

  private applyBuiltinShadowing(
    bundled: Array<SkillItem & { sourcePath: string }>,
    user: Array<SkillItem & { sourcePath: string }>
  ): Array<SkillItem & { sourcePath: string }> {
    const userBases = new Set(user.map((skill) => parseSkillFileName(skill.slug).base))
    const visibleBundled = bundled.filter(
      (skill) => !userBases.has(parseSkillFileName(skill.slug).base)
    )
    return [...visibleBundled, ...user]
  }

  private async resolveExtractedSkillRoot(extractDir: string): Promise<string> {
    const rootSkillFile = join(extractDir, SKILL_FILE_NAME)
    try {
      await stat(rootSkillFile)
      return extractDir
    } catch {
      // skill may be nested one level down
    }

    const entries = await readdir(extractDir, { withFileTypes: true })
    const directories = entries.filter(
      (entry) => entry.isDirectory() && !entry.name.startsWith('.')
    )
    if (directories.length !== 1) {
      throw new Error(
        `Extracted package must contain ${SKILL_FILE_NAME} at the root or in a single folder.`
      )
    }

    const nestedRoot = join(extractDir, directories[0].name)
    try {
      await stat(join(nestedRoot, SKILL_FILE_NAME))
      return nestedRoot
    } catch {
      throw new Error(`Extracted package must contain ${SKILL_FILE_NAME}.`)
    }
  }

  private async removeUserSkillsByBase(baseName: string, keepSlug?: string): Promise<void> {
    let entries
    try {
      entries = await readdir(this.userSkillsDir, { withFileTypes: true })
    } catch {
      return
    }

    await Promise.all(
      entries.map(async (entry) => {
        if (!entry.isDirectory() || entry.name.startsWith('.')) return
        if (keepSlug && entry.name === keepSlug) return
        if (parseSkillFileName(entry.name).base !== baseName) return

        const targetDir = join(this.userSkillsDir, entry.name)
        if (!isPathInside(this.getUserSkillsRoot(), resolve(targetDir))) return
        await rm(targetDir, { recursive: true, force: true })
      })
    )
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
      const { version } = parseSkillFileName(entry.name)
      skills.push({
        slug: entry.name,
        name: resolveSkillDisplayName(entry.name, frontmatter.name),
        description: frontmatter.description?.trim() || undefined,
        version: version || undefined,
        builtin,
        sourcePath
      })
    }

    return skills
  }
}
