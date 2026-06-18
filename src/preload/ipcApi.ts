import type {
  AgentActivityEvent,
  AgentErrorEvent,
  AgentFilesChangedEvent,
  AgentMessageEvent,
  AgentPermissionRequest,
  AgentPermissionResponse,
  AgentRewindParams,
  AgentRewindResult,
  AgentStartTurnParams,
  AgentTurnCompleteEvent,
  ChatMessage,
  ChatMessageRunStatus,
  CreateProjectPayload,
  CreateUserModelConfigPayload,
  LegacyProjectPayload,
  ProjectConversation,
  ProjectFileContent,
  ProjectFileNode,
  ProjectItem,
  SerialPortInfo,
  UserModelConfig,
  UpdateUserModelConfigPayload
} from '../shared/types'
import type { BundledFirmwareInfo } from '../shared/bundledFirmware'

export interface SerialAPI {
  onPortList(callback: (ports: SerialPortInfo[]) => void): () => void
  selectPort(portId: string): void
  offPortList(): void
}

export interface ProjectAPI {
  list(): Promise<ProjectItem[]>
  create(payload: CreateProjectPayload): Promise<ProjectItem>
  migrateFromLegacy(projects: LegacyProjectPayload[]): Promise<ProjectItem[]>
  rename(projectId: string, name: string): Promise<ProjectItem>
  delete(projectId: string): Promise<void>
  readFile(projectId: string, filePath: string): Promise<ProjectFileContent>
  writeFile(projectId: string, filePath: string, content: string): Promise<void>
  createFile(projectId: string, filePath: string, content?: string): Promise<ProjectFileNode[]>
  importResourceFile(
    projectId: string,
    filePath: string,
    base64Data: string
  ): Promise<ProjectFileNode[]>
  readFileDataUrl(projectId: string, filePath: string): Promise<string>
  deleteFile(projectId: string, filePath: string): Promise<ProjectFileNode[]>
  addConversation(projectId: string): Promise<ProjectConversation>
  deleteConversation(projectId: string, convId: string): Promise<void>
  renameConversation(projectId: string, convId: string, title: string): Promise<ProjectConversation>
  appendConversationMessages(
    projectId: string,
    convId: string,
    messages: ChatMessage[]
  ): Promise<ProjectConversation>
  setTurnDuration(
    projectId: string,
    convId: string,
    userMessageId: string,
    durationMs: number
  ): Promise<ProjectConversation>
  setTurnRunStatus(
    projectId: string,
    convId: string,
    userMessageId: string,
    runStatus: ChatMessageRunStatus
  ): Promise<ProjectConversation>
  setActiveDevice(projectId: string, deviceId?: string): Promise<ProjectItem>
}

export interface AgentAPI {
  startTurn(params: AgentStartTurnParams): Promise<{ turnId: string }>
  respondPermission(response: AgentPermissionResponse): Promise<void>
  interrupt(convId: string): Promise<void>
  rewindFiles(params: AgentRewindParams): Promise<AgentRewindResult>
  onMessage(callback: (event: AgentMessageEvent) => void): () => void
  onActivity(callback: (event: AgentActivityEvent) => void): () => void
  onPermission(callback: (event: AgentPermissionRequest) => void): () => void
  onFilesChanged(callback: (event: AgentFilesChangedEvent) => void): () => void
  onTurnComplete(callback: (event: AgentTurnCompleteEvent) => void): () => void
  onError(callback: (event: AgentErrorEvent) => void): () => void
}

export interface ModelAPI {
  list(): Promise<UserModelConfig[]>
  create(payload: CreateUserModelConfigPayload): Promise<UserModelConfig>
  update(modelId: string, payload: UpdateUserModelConfigPayload): Promise<UserModelConfig>
  delete(modelId: string): Promise<void>
}

export interface FirmwareAPI {
  generateNvsFromCsv(csvText: string, size: number | string): Promise<Uint8Array>
  getBundledInfo(): Promise<BundledFirmwareInfo>
  readBundled(): Promise<Uint8Array>
}

export interface IpcAPI {
  project: ProjectAPI
  agent: AgentAPI
  model: ModelAPI
  serial: SerialAPI
  firmware: FirmwareAPI
}
