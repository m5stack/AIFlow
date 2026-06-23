import { create } from 'zustand'
import { toast } from '@heroui/react'
import type {
  ChatMessage,
  ChatMessageRunStatus,
  LegacyProjectPayload,
  ProjectConversation,
  ProjectFileNode,
  ProjectItem
} from '../types/project'
import { useClientIdStore } from './clientIdStore'
import { useDeviceStore } from './deviceStore'
import { runProjectOnDevice } from '../utils/device/runProjectOnDevice'
import { fileKindFromPath, resolveFileKind } from '../utils/project/fileKind'

const LEGACY_PROJECTS_STORAGE_KEY = 'vibe:projects'
const LEGACY_PROJECTS_BACKUP_KEY = 'vibe:projects:legacyBackup'
const ACTIVE_PROJECT_ID_STORAGE_KEY = 'vibe:activeProjectId'
const AUTO_RUN_AFTER_CHAT_KEY = 'vibe:autoRunAfterChat'

export type FileSelection = {
  kind: 'code' | 'image' | 'resource'
  name: string
  path?: string
  url?: string
}

export type CreateProjectPayload = {
  projectName: string
  activeDeviceId?: string
  code: string
}

const readFileAsBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error('Failed to read file.'))
        return
      }
      resolve(result.split(',')[1] ?? '')
    }
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file.'))
    reader.readAsDataURL(file)
  })

const formatTimestamp = (): string =>
  new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })

const loadActiveProjectId = (): string | undefined => {
  return localStorage.getItem(ACTIVE_PROJECT_ID_STORAGE_KEY) || undefined
}

const persistActiveProjectId = (id: string | undefined): void => {
  if (id) localStorage.setItem(ACTIVE_PROJECT_ID_STORAGE_KEY, id)
  else localStorage.removeItem(ACTIVE_PROJECT_ID_STORAGE_KEY)
}

const loadAutoRunAfterChatEnabled = (): boolean => {
  const raw = localStorage.getItem(AUTO_RUN_AFTER_CHAT_KEY)
  if (raw === 'false') return false
  return true
}

const persistAutoRunAfterChatEnabled = (enabled: boolean): void => {
  localStorage.setItem(AUTO_RUN_AFTER_CHAT_KEY, String(enabled))
}

const readLegacyProjects = (): LegacyProjectPayload[] => {
  const raw = localStorage.getItem(LEGACY_PROJECTS_STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as LegacyProjectPayload[]) : []
  } catch {
    return []
  }
}

const backupLegacyProjects = (): void => {
  const raw = localStorage.getItem(LEGACY_PROJECTS_STORAGE_KEY)
  if (!raw) return
  localStorage.setItem(LEGACY_PROJECTS_BACKUP_KEY, raw)
  localStorage.removeItem(LEGACY_PROJECTS_STORAGE_KEY)
}

const fileNameFromPath = (filePath: string): string => filePath.split('/').pop() || filePath

const firstCodeFile = (nodes: ProjectFileNode[]): ProjectFileNode | undefined => {
  for (const node of nodes) {
    if (node.type === 'file') return node
    const child = firstCodeFile(node.children ?? [])
    if (child) return child
  }
  return undefined
}

const firstEditableCodeFile = (nodes: ProjectFileNode[]): ProjectFileNode | undefined => {
  for (const node of nodes) {
    if (node.type === 'file' && node.language !== 'image' && node.language !== 'resource')
      return node
    if (node.type === 'folder') {
      const child = firstEditableCodeFile(node.children ?? [])
      if (child) return child
    }
  }
  return undefined
}

const preloadCodeEditorCache = async (
  projectId: string,
  files: ProjectFileNode[],
  loadProjectFile: (
    projectId: string,
    filePath: string,
    options?: { updateSelection?: boolean }
  ) => Promise<void>
): Promise<void> => {
  const codePath = firstEditableCodeFile(files)?.path
  if (codePath) await loadProjectFile(projectId, codePath, { updateSelection: false })
}

const ensureProjectConvSelection = (
  projects: ProjectItem[],
  projectId: string,
  selectedConvByProject: Record<string, string>
): Record<string, string> => {
  const project = projects.find((p) => p.id === projectId)
  const existingConvId = selectedConvByProject[projectId]
  if (project?.conversations.some((c) => c.id === existingConvId)) return selectedConvByProject
  const firstConv = project?.conversations[0]
  return firstConv ? { ...selectedConvByProject, [projectId]: firstConv.id } : selectedConvByProject
}

const conversationReplaced = (
  projects: ProjectItem[],
  projectId: string,
  conversation: ProjectConversation
): ProjectItem[] =>
  projects.map((project) =>
    project.id === projectId
      ? {
          ...project,
          conversations: project.conversations.map((item) =>
            item.id === conversation.id ? conversation : item
          ),
          updatedAt: conversation.updatedAt
        }
      : project
  )

const applyTurnPatch = (
  conversation: ProjectConversation,
  userMessageId: string,
  patch: { durationMs?: number; runStatus?: ChatMessageRunStatus }
): ProjectConversation => {
  const userIndex = conversation.messages.findIndex((message) => message.id === userMessageId)
  if (userIndex === -1) return conversation

  let lastAssistantIndex = -1
  for (let i = userIndex + 1; i < conversation.messages.length; i++) {
    if (conversation.messages[i].role === 'user') break
    if (conversation.messages[i].role === 'assistant') lastAssistantIndex = i
  }
  if (lastAssistantIndex === -1) return conversation

  const messages = conversation.messages.map((message, index) =>
    index === lastAssistantIndex ? { ...message, ...patch } : message
  )
  return { ...conversation, messages }
}

let writeTimer: number | undefined
let pendingFileWrite: { projectId: string; filePath: string; content: string } | undefined
// Monotonic token so only the latest-issued code-file load applies its state,
// preventing an out-of-order stale read from overwriting newer content.
let fileLoadSeq = 0

const flushPendingProjectFileWrite = (): Promise<void> => {
  if (writeTimer) {
    window.clearTimeout(writeTimer)
    writeTimer = undefined
  }
  const pending = pendingFileWrite
  pendingFileWrite = undefined
  if (!pending) return Promise.resolve()
  return window.ipc.project
    .writeFile(pending.projectId, pending.filePath, pending.content)
    .then(() => useProjectStore.getState().refreshProject(pending.projectId))
    .catch((error) => {
      toast.danger(`Write file failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    })
}

interface ProjectStoreState {
  projects: ProjectItem[]
  activeProjectId: string | undefined
  selectedFile: FileSelection | null
  codeFilePath: string | null
  selectedFileContent: string
  selectedFileLanguage: string
  selectedConvByProject: Record<string, string>
  autoRunAfterChatEnabled: boolean
  showNewProjectDialog: boolean
  isInitialized: boolean
  isLoadingProjects: boolean
  isLoadingFile: boolean

  initialize: () => Promise<void>
  refreshProject: (projectId: string) => Promise<void>
  setActiveProjectId: (id: string | undefined) => void
  setSelectedConv: (projectId: string, convId: string) => void
  selectProjectFile: (projectId: string, file: FileSelection) => void
  setSelectedFile: (file: FileSelection | null) => void
  loadProjectFile: (
    projectId: string,
    filePath: string,
    options?: { updateSelection?: boolean }
  ) => Promise<void>
  loadProjectImage: (projectId: string, filePath: string, name: string) => Promise<void>
  updateProjectFileContent: (content: string) => void
  createProjectFile: (projectId: string, filePath: string) => Promise<void>
  importProjectResource: (projectId: string, file: File) => Promise<void>
  deleteProjectFile: (projectId: string, filePath: string) => Promise<void>
  setShowNewProjectDialog: (show: boolean) => void
  addConversation: (projectId: string) => Promise<void>
  deleteConversation: (projectId: string, convId: string) => Promise<void>
  renameConversation: (projectId: string, convId: string, title: string) => Promise<void>
  appendConversationMessages: (
    projectId: string,
    convId: string,
    messages: ChatMessage[]
  ) => Promise<void>
  setTurnDuration: (
    projectId: string,
    convId: string,
    userMessageId: string,
    durationMs: number
  ) => Promise<void>
  setTurnRunStatus: (
    projectId: string,
    convId: string,
    userMessageId: string,
    runStatus: ChatMessageRunStatus
  ) => Promise<void>
  autoRunGeneratedCode: (projectId: string, convId: string, userMessageId: string) => Promise<void>
  setAutoRunAfterChatEnabled: (enabled: boolean) => void
  createProject: (payload: CreateProjectPayload) => Promise<boolean>
  renameProject: (id: string, name: string) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  setProjectActiveDevice: (projectId: string, deviceId: string) => Promise<void>
  clearActiveDeviceReferences: (deviceId: string) => Promise<void>
  handleAgentMessage: (projectId: string, convId: string, message: ChatMessage) => void
  handleAgentFilesChanged: (projectId: string, paths: string[]) => Promise<void>
  reloadActiveCodeFile: (projectId: string) => Promise<void>
}

export const useProjectStore = create<ProjectStoreState>((set, get) => ({
  projects: [],
  activeProjectId: loadActiveProjectId(),
  selectedFile: null,
  codeFilePath: null,
  selectedFileContent: '',
  selectedFileLanguage: 'python',
  selectedConvByProject: {},
  autoRunAfterChatEnabled: loadAutoRunAfterChatEnabled(),
  showNewProjectDialog: false,
  isInitialized: false,
  isLoadingProjects: false,
  isLoadingFile: false,

  initialize: async () => {
    if (get().isInitialized || get().isLoadingProjects) return
    set({ isLoadingProjects: true })
    try {
      let projects = await window.ipc.project.list()
      const legacyProjects = readLegacyProjects()
      if (projects.length === 0 && legacyProjects.length > 0) {
        projects = await window.ipc.project.migrateFromLegacy(legacyProjects)
        backupLegacyProjects()
      }

      const storedActiveId = loadActiveProjectId()
      const activeProjectId = projects.some((project) => project.id === storedActiveId)
        ? storedActiveId
        : projects[0]?.id
      const selectedConvByProject = activeProjectId
        ? ensureProjectConvSelection(projects, activeProjectId, {})
        : {}
      persistActiveProjectId(activeProjectId)

      set({
        projects,
        activeProjectId,
        selectedConvByProject,
        isInitialized: true,
        isLoadingProjects: false
      })

      const activeProject = projects.find((project) => project.id === activeProjectId)
      const activeFilePath =
        activeProject?.activeFilePath || firstCodeFile(activeProject?.files ?? [])?.path
      if (activeProjectId && activeFilePath) {
        const files = activeProject?.files ?? []
        const kind = resolveFileKind(activeFilePath, files)
        if (kind === 'image') {
          await get().loadProjectImage(
            activeProjectId,
            activeFilePath,
            fileNameFromPath(activeFilePath)
          )
          await preloadCodeEditorCache(activeProjectId, files, get().loadProjectFile)
        } else if (kind === 'resource') {
          set({
            selectedFile: {
              kind: 'resource',
              name: fileNameFromPath(activeFilePath),
              path: activeFilePath
            }
          })
          await preloadCodeEditorCache(activeProjectId, files, get().loadProjectFile)
        } else {
          await get().loadProjectFile(activeProjectId, activeFilePath)
        }
      }
    } catch (error) {
      set({ isLoadingProjects: false })
      toast.danger(
        `Load projects failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  },

  refreshProject: async (projectId) => {
    const projects = await window.ipc.project.list()
    const nextProject = projects.find((project) => project.id === projectId)
    if (!nextProject) return
    set((state) => ({
      projects: state.projects.map((project) => (project.id === projectId ? nextProject : project))
    }))
  },

  setActiveProjectId: (id) => {
    const { projects, selectedConvByProject } = get()
    const selectedProject = projects.find((project) => project.id === id)
    const activeFilePath =
      selectedProject?.activeFilePath || firstCodeFile(selectedProject?.files ?? [])?.path
    const fileKind = activeFilePath
      ? resolveFileKind(activeFilePath, selectedProject?.files ?? [])
      : null
    set({
      activeProjectId: id,
      selectedFile: activeFilePath
        ? {
            kind: fileKind ?? 'code',
            name: fileNameFromPath(activeFilePath),
            path: activeFilePath
          }
        : null,
      selectedConvByProject: id
        ? ensureProjectConvSelection(projects, id, selectedConvByProject)
        : selectedConvByProject
    })
    persistActiveProjectId(id)
    if (id && activeFilePath && fileKind) {
      if (fileKind === 'image') {
        void get()
          .loadProjectImage(id, activeFilePath, fileNameFromPath(activeFilePath))
          .then(() =>
            preloadCodeEditorCache(id, selectedProject?.files ?? [], get().loadProjectFile)
          )
      } else if (fileKind !== 'resource') {
        void get().loadProjectFile(id, activeFilePath)
      }
    }
  },

  setSelectedConv: (projectId, convId) => {
    if (projectId !== get().activeProjectId) get().setActiveProjectId(projectId)
    set((state) => ({
      selectedConvByProject: { ...state.selectedConvByProject, [projectId]: convId }
    }))
  },

  selectProjectFile: (projectId, file) => {
    if (projectId !== get().activeProjectId) {
      const { projects, selectedConvByProject } = get()
      set({
        activeProjectId: projectId,
        selectedConvByProject: ensureProjectConvSelection(
          projects,
          projectId,
          selectedConvByProject
        )
      })
      persistActiveProjectId(projectId)
    }
    if (file.kind === 'code' && file.path) {
      if (file.path === get().codeFilePath) {
        set({ selectedFile: { kind: 'code', name: file.name, path: file.path } })
      } else {
        void get().loadProjectFile(projectId, file.path)
      }
      return
    }

    if (file.kind === 'resource') {
      set({ selectedFile: file })
      return
    }

    set({ selectedFile: file })
    if (file.kind === 'image' && file.path)
      void get().loadProjectImage(projectId, file.path, file.name)
  },

  setSelectedFile: (file) => set({ selectedFile: file }),

  loadProjectFile: async (projectId, filePath, options) => {
    const updateSelection = options?.updateSelection !== false
    const seq = ++fileLoadSeq
    set({ isLoadingFile: true })
    try {
      const file = await window.ipc.project.readFile(projectId, filePath)
      if (seq !== fileLoadSeq) return
      set({
        codeFilePath: file.path,
        selectedFileContent: file.content,
        selectedFileLanguage: file.language,
        ...(updateSelection
          ? { selectedFile: { kind: 'code', name: file.name, path: file.path } }
          : {}),
        isLoadingFile: false
      })
    } catch (error) {
      set({ isLoadingFile: false })
      toast.danger(`Read file failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  },

  loadProjectImage: async (projectId, filePath, name) => {
    set({ isLoadingFile: true })
    try {
      const url = await window.ipc.project.readFileDataUrl(projectId, filePath)
      set({
        selectedFile: { kind: 'image', name, path: filePath, url },
        isLoadingFile: false
      })
    } catch (error) {
      set({ isLoadingFile: false })
      toast.danger(`Read image failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  },

  updateProjectFileContent: (content) => {
    const { activeProjectId, codeFilePath, projects } = get()
    if (!activeProjectId || !codeFilePath) return
    set({
      selectedFileContent: content,
      projects: projects.map((project) =>
        project.id === activeProjectId ? { ...project, activeFilePath: codeFilePath } : project
      )
    })
    pendingFileWrite = { projectId: activeProjectId, filePath: codeFilePath, content }
    if (writeTimer) window.clearTimeout(writeTimer)
    writeTimer = window.setTimeout(() => {
      flushPendingProjectFileWrite()
    }, 350)
  },

  createProjectFile: async (projectId, filePath) => {
    try {
      const files = await window.ipc.project.createFile(projectId, filePath, '')
      set((state) => ({
        projects: state.projects.map((project) =>
          project.id === projectId ? { ...project, files, activeFilePath: filePath } : project
        )
      }))
      get().selectProjectFile(projectId, {
        kind: 'code',
        name: filePath.split('/').pop() || filePath,
        path: filePath
      })
    } catch (error) {
      toast.danger(
        `Create file failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  },

  importProjectResource: async (projectId, file) => {
    try {
      const base64Data = await readFileAsBase64(file)
      const filePath = file.name
      const files = await window.ipc.project.importResourceFile(projectId, filePath, base64Data)
      set((state) => ({
        projects: state.projects.map((project) =>
          project.id === projectId ? { ...project, files, activeFilePath: filePath } : project
        )
      }))
      get().selectProjectFile(projectId, {
        kind: fileKindFromPath(filePath),
        name: file.name,
        path: filePath
      })
    } catch (error) {
      toast.danger(
        `Import file failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  },

  deleteProjectFile: async (projectId, filePath) => {
    try {
      const files = await window.ipc.project.deleteFile(projectId, filePath)
      set((state) => ({
        projects: state.projects.map((project) =>
          project.id === projectId ? { ...project, files } : project
        ),
        selectedFile: state.selectedFile?.path === filePath ? null : state.selectedFile,
        codeFilePath: state.codeFilePath === filePath ? null : state.codeFilePath,
        selectedFileContent: state.codeFilePath === filePath ? '' : state.selectedFileContent,
        selectedFileLanguage:
          state.codeFilePath === filePath ? 'python' : state.selectedFileLanguage
      }))
    } catch (error) {
      toast.danger(
        `Delete file failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  },

  setShowNewProjectDialog: (show) => set({ showNewProjectDialog: show }),

  addConversation: async (projectId) => {
    const conversation = await window.ipc.project.addConversation(projectId)
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === projectId
          ? {
              ...project,
              conversations: [conversation, ...project.conversations],
              updatedAt: conversation.updatedAt
            }
          : project
      ),
      selectedConvByProject: { ...state.selectedConvByProject, [projectId]: conversation.id }
    }))
  },

  deleteConversation: async (projectId, convId) => {
    const project = get().projects.find((item) => item.id === projectId)
    if (!project || project.conversations.length <= 1) return
    await window.ipc.project.deleteConversation(projectId, convId)
    await get().refreshProject(projectId)
    const nextProject = get().projects.find((item) => item.id === projectId)
    const firstConv = nextProject?.conversations[0]
    if (firstConv && get().selectedConvByProject[projectId] === convId) {
      set((state) => ({
        selectedConvByProject: { ...state.selectedConvByProject, [projectId]: firstConv.id }
      }))
    }
  },

  renameConversation: async (projectId, convId, title) => {
    try {
      const conversation = await window.ipc.project.renameConversation(projectId, convId, title)
      set((state) => ({ projects: conversationReplaced(state.projects, projectId, conversation) }))
      toast.success(`Chat renamed to "${conversation.title}".`)
    } catch (error) {
      toast.danger(`Rename failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  },

  appendConversationMessages: async (projectId, convId, messages) => {
    if (messages.length === 0) return
    const conversation = await window.ipc.project.appendConversationMessages(
      projectId,
      convId,
      messages
    )
    set((state) => ({ projects: conversationReplaced(state.projects, projectId, conversation) }))
  },

  setTurnDuration: async (projectId, convId, userMessageId, durationMs) => {
    set((state) => {
      const project = state.projects.find((item) => item.id === projectId)
      const conversation = project?.conversations.find((item) => item.id === convId)
      if (!conversation) return state
      const nextConversation = applyTurnPatch(conversation, userMessageId, { durationMs })
      if (nextConversation === conversation) return state
      return { projects: conversationReplaced(state.projects, projectId, nextConversation) }
    })

    try {
      const conversation = await window.ipc.project.setTurnDuration(
        projectId,
        convId,
        userMessageId,
        durationMs
      )
      set((state) => ({ projects: conversationReplaced(state.projects, projectId, conversation) }))
    } catch (error) {
      toast.danger(
        `Failed to save response time: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  },

  setTurnRunStatus: async (projectId, convId, userMessageId, runStatus) => {
    set((state) => {
      const project = state.projects.find((item) => item.id === projectId)
      const conversation = project?.conversations.find((item) => item.id === convId)
      if (!conversation) return state
      const nextConversation = applyTurnPatch(conversation, userMessageId, { runStatus })
      if (nextConversation === conversation) return state
      return { projects: conversationReplaced(state.projects, projectId, nextConversation) }
    })

    // 'running' is transient feedback only; persist terminal states.
    if (runStatus === 'running') return

    try {
      const conversation = await window.ipc.project.setTurnRunStatus(
        projectId,
        convId,
        userMessageId,
        runStatus
      )
      set((state) => ({ projects: conversationReplaced(state.projects, projectId, conversation) }))
    } catch (error) {
      toast.danger(
        `Failed to save run status: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  },

  autoRunGeneratedCode: async (projectId, convId, userMessageId) => {
    if (!get().autoRunAfterChatEnabled) return

    const state = get()
    const project = state.projects.find((item) => item.id === projectId)
    if (!project) return

    const pool = useDeviceStore.getState().devices
    const device = pool.find((item) => item.id === project.activeDeviceId)

    // No valid active device: skip silently (no badge).
    if (!device?.id) return

    try {
      // Read from disk (no selectedPath) so the agent's freshly written files are used.
      const { ran } = await runProjectOnDevice({
        projectId,
        deviceId: device.id,
        clientId: useClientIdStore.getState().clientId,
        fileNodes: project.files ?? [],
        includeMainPyInDownload: false
      })

      // No main.py content: treat as "no code generated", show no badge.
      if (!ran) return
      await get().setTurnRunStatus(projectId, convId, userMessageId, 'done')
    } catch (error) {
      toast.danger(`Run failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      void get().setTurnRunStatus(projectId, convId, userMessageId, 'failed')
    }
  },

  setAutoRunAfterChatEnabled: (enabled) => {
    persistAutoRunAfterChatEnabled(enabled)
    set({ autoRunAfterChatEnabled: enabled })
  },

  createProject: async (payload) => {
    const safeName = payload.projectName.trim()
    if (!safeName) {
      toast.danger('Create failed: project name cannot be empty.')
      return false
    }
    const pool = useDeviceStore.getState().devices
    if (payload.activeDeviceId && !pool.some((device) => device.id === payload.activeDeviceId)) {
      toast.danger('Create failed: selected device is not available.')
      return false
    }
    if (
      get().projects.some((project) => project.projectName.toLowerCase() === safeName.toLowerCase())
    ) {
      toast.danger('Create failed: project name already exists.')
      return false
    }

    try {
      const project = await window.ipc.project.create({
        projectName: safeName,
        activeDeviceId: payload.activeDeviceId || undefined,
        code: payload.code
      })
      persistActiveProjectId(project.id)
      set((state) => ({
        projects: [project, ...state.projects],
        activeProjectId: project.id,
        showNewProjectDialog: false,
        selectedConvByProject: {
          ...state.selectedConvByProject,
          [project.id]: project.conversations[0]?.id
        }
      }))
      if (project.activeFilePath) await get().loadProjectFile(project.id, project.activeFilePath)
      toast.success(`Project "${safeName}" created.`)
      return true
    } catch (error) {
      toast.danger(`Create failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return false
    }
  },

  renameProject: async (id, name) => {
    try {
      const project = await window.ipc.project.rename(id, name)
      set((state) => ({
        projects: state.projects.map((item) => (item.id === id ? project : item))
      }))
      toast.success(`Project renamed to "${project.projectName}".`)
    } catch (error) {
      toast.danger(`Rename failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  },

  deleteProject: async (id) => {
    const current = get().projects.find((project) => project.id === id)
    if (!current) return
    const wasActive = get().activeProjectId === id
    await window.ipc.project.delete(id)
    set((state) => {
      const projects = state.projects.filter((project) => project.id !== id)
      const activeProjectId = wasActive ? projects[0]?.id : state.activeProjectId
      persistActiveProjectId(activeProjectId)
      return {
        projects,
        activeProjectId,
        ...(wasActive
          ? {
              selectedFile: null,
              codeFilePath: null,
              selectedFileContent: '',
              selectedFileLanguage: 'python'
            }
          : {})
      }
    })
    if (wasActive) {
      get().setActiveProjectId(get().activeProjectId)
    }
    toast.success(`Project "${current.projectName}" deleted.`)
  },

  setProjectActiveDevice: async (projectId, deviceId) => {
    const pool = useDeviceStore.getState().devices
    if (!pool.some((device) => device.id === deviceId)) return
    try {
      const nextProject = await window.ipc.project.setActiveDevice(projectId, deviceId)
      set((state) => ({
        projects: state.projects.map((item) => (item.id === projectId ? nextProject : item))
      }))
    } catch (error) {
      toast.danger(
        `Set device failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  },

  clearActiveDeviceReferences: async (deviceId) => {
    const affectedProjects = get().projects.filter(
      (project) => project.activeDeviceId === deviceId
    )
    for (const project of affectedProjects) {
      try {
        const nextProject = await window.ipc.project.setActiveDevice(project.id, undefined)
        set((state) => ({
          projects: state.projects.map((item) => (item.id === project.id ? nextProject : item))
        }))
      } catch (error) {
        toast.danger(
          `Clear device failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }
  },

  handleAgentMessage: (projectId, convId, message) => {
    set((state) => {
      const project = state.projects.find((item) => item.id === projectId)
      const conversation = project?.conversations.find((item) => item.id === convId)
      if (!conversation) return state

      const existingIndex = conversation.messages.findIndex((item) => item.id === message.id)
      const messages =
        existingIndex >= 0
          ? conversation.messages.map((item, index) => (index === existingIndex ? message : item))
          : [...conversation.messages, message]

      const nextConversation = {
        ...conversation,
        messages,
        updatedAt: new Date().toISOString()
      }
      return { projects: conversationReplaced(state.projects, projectId, nextConversation) }
    })
  },

  handleAgentFilesChanged: async (projectId, paths) => {
    await flushPendingProjectFileWrite()
    await get().refreshProject(projectId)
    const { activeProjectId, codeFilePath, selectedFile } = get()
    const changedPaths = paths.map((path) => path.replaceAll('\\', '/'))
    const shouldReloadCodeFile =
      activeProjectId === projectId &&
      !!codeFilePath &&
      changedPaths.length > 0 &&
      changedPaths.some((path) => path === codeFilePath || path.endsWith(`/${codeFilePath}`))

    if (shouldReloadCodeFile) {
      await get().loadProjectFile(projectId, codeFilePath, {
        updateSelection: selectedFile?.kind !== 'image' && selectedFile?.kind !== 'resource'
      })
    }
  },

  // Authoritative reload after a turn ends: by now all agent writes have landed,
  // so re-reading the open code file from disk guarantees the editor matches disk.
  reloadActiveCodeFile: async (projectId) => {
    await flushPendingProjectFileWrite()
    await get().refreshProject(projectId)
    const { activeProjectId, codeFilePath, selectedFile } = get()
    if (activeProjectId !== projectId || !codeFilePath) return
    await get().loadProjectFile(projectId, codeFilePath, {
      updateSelection: selectedFile?.kind !== 'image' && selectedFile?.kind !== 'resource'
    })
  }
}))

export { flushPendingProjectFileWrite }

export const createUserChatMessage = (content: string): ChatMessage => ({
  id: `user-${Date.now()}`,
  role: 'user',
  content,
  timestamp: formatTimestamp()
})
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    flushPendingProjectFileWrite()
  })
}
