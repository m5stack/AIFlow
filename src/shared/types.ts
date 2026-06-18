export interface ChatCodeBlock {
  language: string
  code: string
}

export type ChatMessageRunStatus = 'running' | 'done' | 'failed'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  /** Extended thinking / reasoning text from the model, when available. */
  reasoning?: string
  /** True while the message is still being streamed from the agent. */
  isStreaming?: boolean
  codeBlocks?: ChatCodeBlock[]
  durationMs?: number
  runStatus?: ChatMessageRunStatus
}

export interface ProjectConversation {
  id: string
  title: string
  claudeSessionId?: string
  updatedAt: string
  messages: ChatMessage[]
}

export interface ProjectFileNode {
  path: string
  name: string
  type: 'file' | 'folder'
  language?: string
  children?: ProjectFileNode[]
}

export interface ProjectFileContent {
  path: string
  name: string
  language: string
  content: string
  updatedAt: string
}

export interface ProjectItem {
  id: string
  projectName: string
  rootPath: string
  activeDeviceId?: string
  conversations: ProjectConversation[]
  files: ProjectFileNode[]
  activeFilePath?: string
  language: string
  createdAt: string
  updatedAt: string
}

export interface ProjectManifest {
  id: string
  projectName: string
  rootPath: string
  activeDeviceId?: string
  language: string
  activeFilePath?: string
  createdAt: string
  updatedAt: string
}

export interface CreateProjectPayload {
  projectName: string
  activeDeviceId?: string
  code: string
}

export interface LegacyProjectPayload {
  id?: string
  projectName?: string
  conversations?: ProjectConversation[]
  code?: string
  language?: string
  createdAt?: string
  updatedAt?: string
}

export interface UserModelConfig {
  id: string
  label: string
  model: string
  provider: 'anthropic'
  baseUrl?: string
  disableNonessentialTraffic?: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateUserModelConfigPayload {
  label: string
  model: string
  apiKey: string
  baseUrl?: string
  disableNonessentialTraffic?: boolean
}

export interface UpdateUserModelConfigPayload {
  label: string
  model: string
  apiKey?: string
  baseUrl?: string
  disableNonessentialTraffic?: boolean
}

export interface AgentActiveDevice {
  id: string
  name: string
  type: string
}

export interface AgentStartTurnParams {
  projectId: string
  convId: string
  prompt: string
  activeDevice?: AgentActiveDevice
  model?: string
  modelConfigId?: string
}

export interface AgentPermissionRequest {
  requestId: string
  projectId: string
  convId: string
  toolName: string
  input: Record<string, unknown>
  title?: string
  description?: string
  blockedPath?: string
}

export interface AgentPermissionResponse {
  requestId: string
  behavior: 'allow' | 'deny'
  message?: string
  alwaysAllowForSession?: boolean
}

export interface AgentMessageEvent {
  projectId: string
  convId: string
  message: ChatMessage
  sessionId?: string
  rawType?: string
}

export interface AgentActivityEvent {
  projectId: string
  convId: string
  label: string
}

export interface AgentFilesChangedEvent {
  projectId: string
  convId: string
  paths: string[]
}

export interface AgentTurnCompleteEvent {
  projectId: string
  convId: string
  sessionId?: string
  result?: string
  totalCostUsd?: number
}

export interface AgentErrorEvent {
  projectId?: string
  convId?: string
  code: string
  message: string
}

export interface AgentRewindParams {
  convId: string
  userMessageId: string
  dryRun?: boolean
}

export interface AgentRewindResult {
  canRewind: boolean
  error?: string
  changes?: unknown
  files?: {
    modified: number
    created: number
    deleted: number
  }
}

export interface SerialPortInfo {
  portId: string
  portName: string
  displayName?: string
  manufacturerName?: string
  vendorId?: string
  productId?: string
}
