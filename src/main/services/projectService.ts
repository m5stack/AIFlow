import { app } from 'electron'
import { randomUUID } from 'crypto'
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from 'path'
import { lstat, mkdir, readFile, readdir, rename, rm, stat, symlink, writeFile } from 'fs/promises'
import { realpathSync } from 'fs'
import type {
  ChatMessage,
  ChatMessageRunStatus,
  CreateProjectPayload,
  LegacyProjectPayload,
  ProjectConversation,
  ProjectFileContent,
  ProjectFileNode,
  ProjectItem,
  ProjectManifest
} from '../../shared/types'
import { languageByExtension, mimeByExtension } from '../../shared/fileExtensions'

const PROJECTS_DIR_NAME = 'projects'
const INDEX_FILE_NAME = 'index.json'
const MANIFEST_FILE_NAME = 'project.json'
const FILES_DIR_NAME = 'files'
const CHATS_DIR_NAME = 'chats'
const ASSETS_DIR_NAME = 'assets'
const DEFAULT_LANGUAGE = 'python'
const DEFAULT_FILE_NAME = 'main.py'
const BUNDLED_SKILLS_DIR_NAME = 'skills'
const FILE_TREE_MAX_ENTRIES = 200
const FILE_TREE_MAX_CHARS = 8000

const AUDIO_EXTENSIONS = new Set(['.aac', '.flac', '.m4a', '.mp3', '.ogg', '.wav'])
const FONT_EXTENSIONS = new Set(['.otf', '.ttf', '.woff', '.woff2'])
const BINARY_EXTENSIONS = new Set(['.bin', '.dat', '.hex'])

const resourceLabelForFile = (filePath: string, language?: string): string | undefined => {
  const ext = extname(filePath).toLowerCase()
  if (language === 'image' || languageByExtension[ext] === 'image') return 'image'
  if (AUDIO_EXTENSIONS.has(ext)) return 'audio'
  if (FONT_EXTENSIONS.has(ext)) return 'font'
  if (BINARY_EXTENSIONS.has(ext) || language === 'resource') return 'binary'
  return undefined
}

const devicePathForProjectFile = (projectRelativePath: string): string =>
  `/flash/res/${projectRelativePath.replace(/^\/+/, '')}`

/** Device code path for images/audio — always under /flash/res/img/ or /flash/res/audio/. */
const codePathForResource = (filePath: string, label: string): string => {
  const filename = basename(filePath)
  if (label === 'image') return `/flash/res/img/${filename}`
  if (label === 'audio') return `/flash/res/audio/${filename}`
  return devicePathForProjectFile(filePath)
}

const DEVICE_RESOURCE_RULES_CRITICAL = [
  'You MUST map project files to device flash paths as follows:',
  '- Project file at <path> (relative to files/) is deployed on device at /flash/res/<path>.',
  '- In generated device code, EVERY resource path MUST start with /flash/res/.',
  '- Use project-relative <path> only for file editing tools (Read/Write/Edit); never use project paths when loading resources in device code.',
  '- When referencing images in device code, use ONLY "/flash/res/img/<filename>" (e.g. "/flash/res/img/logo.png").',
  '- When referencing audio in device code, use ONLY "/flash/res/audio/<filename>" (e.g. "/flash/res/audio/beep.wav").',
  '- NEVER use bare filenames (e.g. "logo.png"), project-relative paths (e.g. "img/logo.png"), or /flash/ paths missing res/ (e.g. "/flash/img/logo.png").',
  '- NEVER use /flash/res/<filename> directly for images or audio — the img/ or audio/ segment is required (e.g. NOT "/flash/res/logo.png").',
  '- NEVER invent resource paths that are not listed in the current project files.'
].join('\n')

const DEVICE_RESOURCE_PATH_GUIDE = [
  DEVICE_RESOURCE_RULES_CRITICAL,
  '',
  'Additional context:',
  '- All project files are deployed under /flash/res/ on the device.',
  '- In device code: images → /flash/res/img/<filename>, audio → /flash/res/audio/<filename>.',
  '- The file list below shows the code path to use for each resource when writing device code.'
].join('\n')

type ProjectIndex = {
  order: string[]
}

const nowIso = (): string => new Date().toISOString()

const safeJsonParse = <T>(raw: string, fallback: T): T => {
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

const isPathInside = (basePath: string, candidatePath: string): boolean => {
  const rel = relative(basePath, candidatePath)
  return rel === '' || (!!rel && !rel.startsWith('..') && !isAbsolute(rel))
}

const createId = (prefix: string): string => `${prefix}-${Date.now()}-${randomUUID().slice(0, 8)}`

const normalizeProjectId = (id?: string): string => {
  if (id && /^[a-zA-Z0-9._-]+$/.test(id)) return id
  return createId('project')
}

const normalizeConversationId = (id?: string): string => {
  if (id && /^[a-zA-Z0-9._-]+$/.test(id)) return id
  return createId('conv')
}

const languageForPath = (filePath: string, fallback = DEFAULT_LANGUAGE): string =>
  languageByExtension[extname(filePath).toLowerCase()] ?? fallback

export { DEVICE_RESOURCE_RULES_CRITICAL }

export class ProjectService {
  private readonly projectsDir: string
  private readonly indexPath: string

  constructor(projectsDir = join(app.getPath('userData'), PROJECTS_DIR_NAME)) {
    this.projectsDir = projectsDir
    this.indexPath = join(projectsDir, INDEX_FILE_NAME)
  }

  async ensureReady(): Promise<void> {
    await mkdir(this.projectsDir, { recursive: true })
    try {
      await stat(this.indexPath)
    } catch {
      await this.writeIndex({ order: [] })
    }
  }

  async listProjects(): Promise<ProjectItem[]> {
    await this.ensureReady()
    const index = await this.readIndex()
    const ids = new Set(index.order)
    const entries = await readdir(this.projectsDir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory()) ids.add(entry.name)
    }

    const projects = await Promise.all(
      Array.from(ids).map(async (id) => {
        try {
          return await this.readProject(id)
        } catch {
          return null
        }
      })
    )
    const valid = projects.filter((project): project is ProjectItem => project !== null)
    return valid.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  async createProject(payload: CreateProjectPayload, forcedId?: string): Promise<ProjectItem> {
    await this.ensureReady()
    const safeName = payload.projectName.trim()
    if (!safeName) throw new Error('Project name cannot be empty.')

    const existing = await this.listProjects()
    if (existing.some((project) => project.projectName.toLowerCase() === safeName.toLowerCase())) {
      throw new Error('Project name already exists.')
    }

    const id = normalizeProjectId(forcedId)
    const rootPath = this.projectRoot(id)
    const filesRoot = this.filesRoot(id)
    const createdAt = nowIso()
    const manifest: ProjectManifest = {
      id,
      projectName: safeName,
      rootPath,
      activeDeviceId: payload.activeDeviceId || undefined,
      language: DEFAULT_LANGUAGE,
      activeFilePath: DEFAULT_FILE_NAME,
      createdAt,
      updatedAt: createdAt
    }

    await mkdir(filesRoot, { recursive: true })
    await mkdir(this.chatsRoot(id), { recursive: true })
    await mkdir(join(rootPath, ASSETS_DIR_NAME), { recursive: true })
    await writeFile(join(filesRoot, DEFAULT_FILE_NAME), payload.code, 'utf8')
    await this.linkBundledSkills(id)
    await this.writeManifest(manifest)
    await this.writeConversation(id, this.createDefaultConversation(safeName))
    await this.prependProjectToIndex(id)
    return this.readProject(id)
  }

  async migrateLegacyProjects(legacyProjects: LegacyProjectPayload[]): Promise<ProjectItem[]> {
    await this.ensureReady()
    const existing = await this.listProjects()
    const existingIds = new Set(existing.map((project) => project.id))
    const existingNames = new Set(existing.map((project) => project.projectName.toLowerCase()))

    for (const legacy of legacyProjects) {
      const id = normalizeProjectId(legacy.id)
      if (existingIds.has(id)) continue

      const name = this.uniqueProjectName(
        (legacy.projectName || 'Untitled Project').trim(),
        existingNames
      )
      const project = await this.createProject(
        {
          projectName: name,
          activeDeviceId: '',
          code: typeof legacy.code === 'string' ? legacy.code : ''
        },
        id
      )

      const manifest = await this.readManifest(project.id)
      manifest.language = typeof legacy.language === 'string' ? legacy.language : DEFAULT_LANGUAGE
      manifest.createdAt =
        typeof legacy.createdAt === 'string' ? legacy.createdAt : manifest.createdAt
      manifest.updatedAt =
        typeof legacy.updatedAt === 'string' ? legacy.updatedAt : manifest.updatedAt
      await this.writeManifest(manifest)

      if (Array.isArray(legacy.conversations) && legacy.conversations.length > 0) {
        await rm(this.chatsRoot(project.id), { recursive: true, force: true })
        await mkdir(this.chatsRoot(project.id), { recursive: true })
        for (const conversation of legacy.conversations) {
          await this.writeConversation(project.id, this.normalizeConversation(name, conversation))
        }
      }
      existingIds.add(id)
      existingNames.add(name.toLowerCase())
    }

    return this.listProjects()
  }

  async renameProject(projectId: string, projectName: string): Promise<ProjectItem> {
    const safeName = projectName.trim()
    if (!safeName) throw new Error('Project name cannot be empty.')
    const projects = await this.listProjects()
    if (
      projects.some(
        (project) =>
          project.id !== projectId && project.projectName.toLowerCase() === safeName.toLowerCase()
      )
    ) {
      throw new Error('Project name already exists.')
    }
    const manifest = await this.readManifest(projectId)
    manifest.projectName = safeName
    manifest.updatedAt = nowIso()
    await this.writeManifest(manifest)
    return this.readProject(projectId)
  }

  async deleteProject(projectId: string): Promise<void> {
    await rm(this.projectRoot(projectId), { recursive: true, force: true })
    const index = await this.readIndex()
    await this.writeIndex({ order: index.order.filter((id) => id !== projectId) })
  }

  async listFiles(projectId: string): Promise<ProjectFileNode[]> {
    await mkdir(this.filesRoot(projectId), { recursive: true })
    return this.readFileTree(this.filesRoot(projectId), '')
  }

  async getProjectFileTreePrompt(projectId: string): Promise<string> {
    const { systemFileTreePrompt } = await this.getProjectTurnContext(projectId)
    return systemFileTreePrompt
  }

  async getProjectTurnContext(projectId: string): Promise<{
    systemFileTreePrompt: string
    turnPromptPrefix: string
  }> {
    const tree = await this.listFiles(projectId)
    const lines: string[] = []
    this.collectFileTreeLines(tree, lines)

    const resourceLines = lines.filter((line) => line.includes('code path:'))
    const resourceSummary =
      resourceLines.length > 0
        ? [
            'Resource files — copy these /flash/res/ paths into device code:',
            ...resourceLines.map((line) => {
              const codePath = line.match(/code path: (\/flash\/res\/[^\s]+)/)?.[1]
              return codePath ? `- ${codePath}` : `- ${line}`
            })
          ].join('\n')
        : 'No resource files in project yet. In device code use /flash/res/img/<filename> for images, /flash/res/audio/<filename> for audio.'

    const turnPromptPrefix = [
      '[MANDATORY — highest priority for this turn]',
      DEVICE_RESOURCE_RULES_CRITICAL,
      resourceSummary
    ].join('\n\n')

    if (lines.length === 0) {
      return {
        systemFileTreePrompt: `${DEVICE_RESOURCE_PATH_GUIDE}\n\nThe project files directory is currently empty.`,
        turnPromptPrefix
      }
    }

    let truncated = lines.length > FILE_TREE_MAX_ENTRIES
    let body = lines.slice(0, FILE_TREE_MAX_ENTRIES).join('\n')
    if (body.length > FILE_TREE_MAX_CHARS) {
      body = body.slice(0, FILE_TREE_MAX_CHARS)
      truncated = true
    }

    const header = [
      'Project files (paths relative to files/ — for Read/Write/Edit tools only):',
      'When loading resources in device code, use the /flash/res/ path shown on each line, not the project path.'
    ].join('\n')
    const footer = truncated ? '\n...(file list truncated)' : ''
    return {
      systemFileTreePrompt: `${DEVICE_RESOURCE_PATH_GUIDE}\n\n${header}\n${body}${footer}`,
      turnPromptPrefix
    }
  }

  async readProjectFile(projectId: string, filePath: string): Promise<ProjectFileContent> {
    const absPath = this.resolveProjectFile(projectId, filePath)
    const fileStat = await stat(absPath)
    if (!fileStat.isFile()) throw new Error('Path is not a file.')
    return {
      path: this.toProjectRelativePath(projectId, absPath),
      name: basename(absPath),
      language: languageForPath(absPath),
      content: await readFile(absPath, 'utf8'),
      updatedAt: fileStat.mtime.toISOString()
    }
  }

  async writeProjectFile(projectId: string, filePath: string, content: string): Promise<void> {
    const absPath = this.resolveProjectFile(projectId, filePath)
    await mkdir(dirname(absPath), { recursive: true })
    await writeFile(absPath, content, 'utf8')
    const manifest = await this.readManifest(projectId)
    manifest.activeFilePath = this.toProjectRelativePath(projectId, absPath)
    manifest.language = languageForPath(absPath, manifest.language)
    manifest.updatedAt = nowIso()
    await this.writeManifest(manifest)
  }

  async createFile(projectId: string, filePath: string, content = ''): Promise<ProjectFileNode[]> {
    await this.writeProjectFile(projectId, filePath, content)
    return this.listFiles(projectId)
  }

  async importResourceFile(
    projectId: string,
    filePath: string,
    base64Data: string
  ): Promise<ProjectFileNode[]> {
    const absPath = this.resolveProjectFile(projectId, filePath)
    await mkdir(dirname(absPath), { recursive: true })
    await writeFile(absPath, Buffer.from(base64Data, 'base64'))
    const manifest = await this.readManifest(projectId)
    manifest.activeFilePath = this.toProjectRelativePath(projectId, absPath)
    manifest.updatedAt = nowIso()
    await this.writeManifest(manifest)
    return this.listFiles(projectId)
  }

  async readProjectFileDataUrl(projectId: string, filePath: string): Promise<string> {
    const absPath = this.resolveProjectFile(projectId, filePath)
    const fileStat = await stat(absPath)
    if (!fileStat.isFile()) throw new Error('Path is not a file.')
    const buffer = await readFile(absPath)
    const mime = mimeByExtension[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
    return `data:${mime};base64,${buffer.toString('base64')}`
  }

  async deleteFile(projectId: string, filePath: string): Promise<ProjectFileNode[]> {
    const absPath = this.resolveProjectFile(projectId, filePath)
    await rm(absPath, { recursive: true, force: true })
    const manifest = await this.readManifest(projectId)
    if (manifest.activeFilePath === filePath) manifest.activeFilePath = DEFAULT_FILE_NAME
    manifest.updatedAt = nowIso()
    await this.writeManifest(manifest)
    return this.listFiles(projectId)
  }

  async addConversation(projectId: string): Promise<ProjectConversation> {
    const conversations = await this.readConversations(projectId)
    const conversation: ProjectConversation = {
      id: normalizeConversationId(),
      title: `Chat ${conversations.length + 1}`,
      updatedAt: nowIso(),
      messages: []
    }
    await this.writeConversation(projectId, conversation)
    await this.touchProject(projectId)
    return conversation
  }

  async deleteConversation(projectId: string, convId: string): Promise<void> {
    const conversations = await this.readConversations(projectId)
    if (conversations.length <= 1) return
    await rm(this.conversationPath(projectId, convId), { force: true })
    await this.touchProject(projectId)
  }

  async renameConversation(
    projectId: string,
    convId: string,
    title: string
  ): Promise<ProjectConversation> {
    const safeTitle = title.trim()
    if (!safeTitle) throw new Error('Chat name cannot be empty.')
    const conversation = await this.readConversation(projectId, convId)
    conversation.title = safeTitle
    conversation.updatedAt = nowIso()
    await this.writeConversation(projectId, conversation)
    await this.touchProject(projectId)
    return conversation
  }

  async appendConversationMessages(
    projectId: string,
    convId: string,
    messages: ChatMessage[]
  ): Promise<ProjectConversation> {
    const conversation = await this.readConversation(projectId, convId)
    conversation.messages = this.upsertMessages(conversation.messages, messages)
    conversation.updatedAt = nowIso()
    await this.writeConversation(projectId, conversation)
    await this.touchProject(projectId)
    return conversation
  }

  private upsertMessages(existing: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
    const next = [...existing]
    for (const message of incoming) {
      const index = next.findIndex((item) => item.id === message.id)
      if (index >= 0) next[index] = message
      else next.push(message)
    }
    return next
  }

  async setTurnDuration(
    projectId: string,
    convId: string,
    userMessageId: string,
    durationMs: number
  ): Promise<ProjectConversation> {
    const conversation = await this.readConversation(projectId, convId)
    const userIndex = conversation.messages.findIndex((message) => message.id === userMessageId)
    if (userIndex === -1) return conversation

    let lastAssistantIndex = -1
    for (let i = userIndex + 1; i < conversation.messages.length; i++) {
      if (conversation.messages[i].role === 'user') break
      if (conversation.messages[i].role === 'assistant') lastAssistantIndex = i
    }
    if (lastAssistantIndex === -1) return conversation

    const messages = [...conversation.messages]
    messages[lastAssistantIndex] = { ...messages[lastAssistantIndex], durationMs }
    conversation.messages = messages
    conversation.updatedAt = nowIso()
    await this.writeConversation(projectId, conversation)
    await this.touchProject(projectId)
    return conversation
  }

  async setTurnRunStatus(
    projectId: string,
    convId: string,
    userMessageId: string,
    runStatus: ChatMessageRunStatus
  ): Promise<ProjectConversation> {
    const conversation = await this.readConversation(projectId, convId)
    const userIndex = conversation.messages.findIndex((message) => message.id === userMessageId)
    if (userIndex === -1) return conversation

    let lastAssistantIndex = -1
    for (let i = userIndex + 1; i < conversation.messages.length; i++) {
      if (conversation.messages[i].role === 'user') break
      if (conversation.messages[i].role === 'assistant') lastAssistantIndex = i
    }
    if (lastAssistantIndex === -1) return conversation

    const messages = [...conversation.messages]
    messages[lastAssistantIndex] = { ...messages[lastAssistantIndex], runStatus }
    conversation.messages = messages
    conversation.updatedAt = nowIso()
    await this.writeConversation(projectId, conversation)
    await this.touchProject(projectId)
    return conversation
  }

  async updateConversationSession(
    projectId: string,
    convId: string,
    sessionId: string
  ): Promise<ProjectConversation> {
    const conversation = await this.readConversation(projectId, convId)
    conversation.claudeSessionId = sessionId
    conversation.updatedAt = nowIso()
    await this.writeConversation(projectId, conversation)
    await this.touchProject(projectId)
    return conversation
  }

  async setActiveDevice(projectId: string, deviceId?: string): Promise<ProjectItem> {
    const manifest = await this.readManifest(projectId)
    manifest.activeDeviceId = deviceId
    manifest.updatedAt = nowIso()
    await this.writeManifest(manifest)
    return this.readProject(projectId)
  }

  async getConversation(projectId: string, convId: string): Promise<ProjectConversation> {
    return this.readConversation(projectId, convId)
  }

  getProjectFilesRoot(projectId: string): string {
    return this.filesRoot(projectId)
  }

  getBundledSkillsRoot(): string {
    const root = resolve(this.bundledSkillsRoot())
    // Canonicalize symlinks (e.g. macOS /var -> /private/var, Gatekeeper App
    // Translocation). Claude Code resolves the doc's realpath when it follows the
    // .claude/skills symlink, then checks it against `additionalDirectories`. If we
    // hand it a non-canonical path the check fails and doc reads are denied in the
    // packaged app.
    try {
      return realpathSync(root)
    } catch {
      return root
    }
  }

  isBundledSkillsPath(filePath: string): boolean {
    if (!filePath || filePath.includes('\0')) return false
    const bundledRoot = this.getBundledSkillsRoot()
    const resolved = isAbsolute(filePath) ? resolve(filePath) : resolve(bundledRoot, filePath)
    // Compare against the canonical path so symlinked locations (macOS App
    // Translocation, /var -> /private/var) still match the canonical bundledRoot.
    let absPath = resolved
    try {
      absPath = realpathSync(resolved)
    } catch {
      // Path may not exist yet; fall back to the lexical resolution.
    }
    return isPathInside(bundledRoot, absPath)
  }

  validateAgentReadPath(projectId: string, filePath: string): boolean {
    if (this.validateProjectFilePath(projectId, filePath)) return true
    return this.isBundledSkillsPath(filePath)
  }

  validateProjectFilePath(projectId: string, filePath: string): boolean {
    try {
      this.resolveProjectFile(projectId, filePath)
      return true
    } catch {
      return false
    }
  }

  async renameFile(
    projectId: string,
    fromPath: string,
    toPath: string
  ): Promise<ProjectFileNode[]> {
    const fromAbs = this.resolveProjectFile(projectId, fromPath)
    const toAbs = this.resolveProjectFile(projectId, toPath)
    await mkdir(dirname(toAbs), { recursive: true })
    await rename(fromAbs, toAbs)
    await this.touchProject(projectId)
    return this.listFiles(projectId)
  }

  private async readProject(projectId: string): Promise<ProjectItem> {
    const manifest = await this.readManifest(projectId)
    await this.linkBundledSkills(projectId)
    return {
      ...manifest,
      conversations: await this.readConversations(projectId),
      files: await this.listFiles(projectId)
    }
  }

  private async readFileTree(absDir: string, relativeDir: string): Promise<ProjectFileNode[]> {
    const entries = await readdir(absDir, { withFileTypes: true })
    type SortableNode = ProjectFileNode & { mtime?: number }
    const nodes: SortableNode[] = await Promise.all(
      entries
        .filter((entry) => !entry.name.startsWith('.'))
        .map(async (entry) => {
          const childRelative = relativeDir ? `${relativeDir}/${entry.name}` : entry.name
          if (entry.isDirectory()) {
            return {
              path: childRelative,
              name: entry.name,
              type: 'folder' as const,
              children: await this.readFileTree(join(absDir, entry.name), childRelative)
            }
          }
          const fileStat = await stat(join(absDir, entry.name))
          return {
            path: childRelative,
            name: entry.name,
            type: 'file' as const,
            language: languageForPath(entry.name, 'resource'),
            mtime: fileStat.mtimeMs
          }
        })
    )
    return nodes
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
        if (a.type === 'folder' && b.type === 'folder') return a.name.localeCompare(b.name)
        const aIsMain = a.path === DEFAULT_FILE_NAME
        const bIsMain = b.path === DEFAULT_FILE_NAME
        if (aIsMain && !bIsMain) return -1
        if (!aIsMain && bIsMain) return 1
        return (a.mtime ?? 0) - (b.mtime ?? 0)
      })
      .map(({ mtime: _mtime, ...node }) => node)
  }

  private collectFileTreeLines(nodes: ProjectFileNode[], lines: string[]): void {
    for (const node of nodes) {
      if (node.type === 'folder') {
        if (node.children?.length) this.collectFileTreeLines(node.children, lines)
        continue
      }
      const label = resourceLabelForFile(node.path, node.language)
      if (label) {
        lines.push(
          `${node.path}  (${label}, code path: ${codePathForResource(node.path, label)})`
        )
      } else {
        lines.push(`${node.path}  (source)`)
      }
    }
  }

  private createDefaultConversation(projectName: string): ProjectConversation {
    return {
      id: normalizeConversationId(),
      title: `${projectName} Chat`,
      updatedAt: nowIso(),
      messages: []
    }
  }

  private async linkBundledSkills(projectId: string): Promise<void> {
    const sourceDir = this.getBundledSkillsRoot()
    const linkType = process.platform === 'win32' ? 'junction' : 'dir'
    const claudeDir = join(this.filesRoot(projectId), '.claude')
    const skillsDir = join(claudeDir, 'skills')

    try {
      await stat(sourceDir)
    } catch {
      // The app can run without bundled skills during local development.
      return
    }

    try {
      await lstat(skillsDir)
      return
    } catch {
      // skillsDir does not exist yet
    }

    await mkdir(claudeDir, { recursive: true })
    await symlink(sourceDir, skillsDir, linkType)
  }

  private bundledSkillsRoot(): string {
    return app.isPackaged
      ? join(process.resourcesPath, BUNDLED_SKILLS_DIR_NAME)
      : join(process.cwd(), 'resources', BUNDLED_SKILLS_DIR_NAME)
  }

  private normalizeConversation(
    projectName: string,
    raw: Partial<ProjectConversation>
  ): ProjectConversation {
    return {
      id: normalizeConversationId(raw.id),
      title: typeof raw.title === 'string' && raw.title.trim() ? raw.title : `${projectName} Chat`,
      claudeSessionId: typeof raw.claudeSessionId === 'string' ? raw.claudeSessionId : undefined,
      updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : nowIso(),
      messages: Array.isArray(raw.messages) ? raw.messages : []
    }
  }

  private async readConversations(projectId: string): Promise<ProjectConversation[]> {
    await mkdir(this.chatsRoot(projectId), { recursive: true })
    const entries = await readdir(this.chatsRoot(projectId), { withFileTypes: true })
    const conversations = await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
        .map(async (entry) => {
          try {
            return await this.readConversation(projectId, entry.name.replace(/\.json$/, ''))
          } catch {
            return null
          }
        })
    )
    const valid = conversations.filter(
      (conversation): conversation is ProjectConversation => !!conversation
    )
    if (valid.length > 0) return valid.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

    const manifest = await this.readManifest(projectId)
    const fallback = this.createDefaultConversation(manifest.projectName)
    await this.writeConversation(projectId, fallback)
    return [fallback]
  }

  private async readConversation(projectId: string, convId: string): Promise<ProjectConversation> {
    const raw = await readFile(this.conversationPath(projectId, convId), 'utf8')
    const parsed = safeJsonParse<ProjectConversation | null>(raw, null)
    if (!parsed) throw new Error('Chat file is invalid.')
    return this.normalizeConversation('Chat', parsed)
  }

  private async writeConversation(
    projectId: string,
    conversation: ProjectConversation
  ): Promise<void> {
    await mkdir(this.chatsRoot(projectId), { recursive: true })
    await writeFile(
      this.conversationPath(projectId, conversation.id),
      JSON.stringify(conversation, null, 2),
      'utf8'
    )
  }

  private async readManifest(projectId: string): Promise<ProjectManifest> {
    const raw = await readFile(join(this.projectRoot(projectId), MANIFEST_FILE_NAME), 'utf8')
    const manifest = safeJsonParse<ProjectManifest | null>(raw, null)
    if (!manifest) throw new Error('Project manifest is invalid.')
    return manifest
  }

  private async writeManifest(manifest: ProjectManifest): Promise<void> {
    await mkdir(this.projectRoot(manifest.id), { recursive: true })
    await writeFile(
      join(this.projectRoot(manifest.id), MANIFEST_FILE_NAME),
      JSON.stringify(manifest, null, 2),
      'utf8'
    )
  }

  private async touchProject(projectId: string): Promise<void> {
    const manifest = await this.readManifest(projectId)
    manifest.updatedAt = nowIso()
    await this.writeManifest(manifest)
  }

  private async readIndex(): Promise<ProjectIndex> {
    await this.ensureReady()
    const raw = await readFile(this.indexPath, 'utf8')
    const parsed = safeJsonParse<ProjectIndex>(raw, { order: [] })
    return { order: Array.isArray(parsed.order) ? parsed.order : [] }
  }

  private async writeIndex(index: ProjectIndex): Promise<void> {
    await mkdir(this.projectsDir, { recursive: true })
    await writeFile(this.indexPath, JSON.stringify(index, null, 2), 'utf8')
  }

  private async prependProjectToIndex(projectId: string): Promise<void> {
    const index = await this.readIndex()
    await this.writeIndex({ order: [projectId, ...index.order.filter((id) => id !== projectId)] })
  }

  private resolveProjectFile(projectId: string, filePath: string): string {
    if (!filePath || filePath.includes('\0')) throw new Error('Invalid file path.')
    const basePath = this.filesRoot(projectId)
    const absPath = resolve(basePath, filePath)
    if (!isPathInside(basePath, absPath)) throw new Error('File path escapes project.')
    return absPath
  }

  private toProjectRelativePath(projectId: string, absPath: string): string {
    return relative(this.filesRoot(projectId), absPath).split(sep).join('/')
  }

  private uniqueProjectName(name: string, existingNames: Set<string>): string {
    const baseName = name || 'Untitled Project'
    let candidate = baseName
    let index = 2
    while (existingNames.has(candidate.toLowerCase())) {
      candidate = `${baseName} ${index}`
      index += 1
    }
    return candidate
  }

  private projectRoot(projectId: string): string {
    return join(this.projectsDir, normalizeProjectId(projectId))
  }

  private filesRoot(projectId: string): string {
    return join(this.projectRoot(projectId), FILES_DIR_NAME)
  }

  private chatsRoot(projectId: string): string {
    return join(this.projectRoot(projectId), CHATS_DIR_NAME)
  }

  private conversationPath(projectId: string, convId: string): string {
    return join(this.chatsRoot(projectId), `${normalizeConversationId(convId)}.json`)
  }
}
