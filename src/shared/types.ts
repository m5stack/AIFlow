export interface ChatCodeBlock {
  language: string
  code: string
}

export type ChatImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

export interface ChatImageAttachment {
  id: string
  name: string
  mediaType: ChatImageMediaType
  /** Raw base64 data without a data URL prefix. */
  data: string
}

export type ChatMessageRunStatus = 'running' | 'done' | 'failed'

export interface ChatTokenUsage {
  inputTokens: number
  outputTokens: number
  cacheCreationInputTokens?: number
  cacheReadInputTokens?: number
  totalCostUsd?: number
}

export interface TokenUsageRecord extends ChatTokenUsage {
  timestamp: string
  model: string
  modelConfigId?: string
  label?: string
  purpose?: 'chat' | 'title'
}

export interface TokenUsageModelStat {
  model: string
  label: string
  inputTokens: number
  outputTokens: number
  cacheTokens: number
  totalTokens: number
  totalCostUsd: number
  turns: number
}

export interface TokenUsageDailyModelStat {
  inputTokens: number
  outputTokens: number
  cacheTokens: number
  totalTokens: number
}

export interface TokenUsageDailyStat {
  date: string
  byModel: Record<string, TokenUsageDailyModelStat>
}

export interface TokenUsageStats {
  generatedAt: string
  retentionDays: 7
  byModel: TokenUsageModelStat[]
  daily: TokenUsageDailyStat[]
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  /** Extended thinking / reasoning text from the model, when available. */
  reasoning?: string
  /** True while the message is still being streamed from the agent. */
  isStreaming?: boolean
  images?: ChatImageAttachment[]
  codeBlocks?: ChatCodeBlock[]
  durationMs?: number
  tokenUsage?: ChatTokenUsage
  runStatus?: ChatMessageRunStatus
}

export interface ProjectConversation {
  id: string
  title: string
  claudeSessionId?: string
  activePromptTemplateId?: string
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
  lastSelectedPromptTemplateId?: string
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
  lastSelectedPromptTemplateId?: string
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

export interface PromptTemplate {
  id: string
  name: string
  content: string
  createdAt: string
  updatedAt: string
}

export interface CreatePromptTemplatePayload {
  name: string
  content: string
}

export interface UpdatePromptTemplatePayload extends CreatePromptTemplatePayload {
  id: string
}

export interface ModelConnectionTestPayload {
  model: string
  apiKey?: string
  baseUrl?: string
  modelId?: string
}

export interface ModelConnectionTestResult {
  ok: boolean
  message: string
  status?: number
}

export interface AgentActiveDevice {
  id: string
  name: string
  type: string
  fileTreeText?: string
  fileTreeRoot?: string
}

export interface AgentStartTurnParams {
  projectId: string
  convId: string
  prompt: string
  images?: ChatImageAttachment[]
  activeDevice?: AgentActiveDevice
  model?: string
  modelConfigId?: string
}

export interface GenerateConversationTitleParams {
  projectId: string
  convId: string
  modelConfigId: string
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
  /** False for resource-only changes that should refresh the UI without running existing code. */
  autoRunEligible?: boolean
}

export interface AgentTurnCompleteEvent {
  projectId: string
  convId: string
  sessionId?: string
  result?: string
  totalCostUsd?: number
  tokenUsage?: ChatTokenUsage
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

export interface SkillItem {
  slug: string
  name: string
  description?: string
  /** Parsed from trailing digits in the folder/slug name, e.g. `1.0.9`. */
  version?: string
  builtin: boolean
}

export type McpTransport = 'stdio' | 'sse' | 'http'

/** Printable ASCII: English letters, numbers, spaces, and common symbols. */
export const MCP_SERVER_NAME_PATTERN = /^[\x20-\x7E]+$/

export const MCP_SERVER_NAME_ERROR =
  'Server name can only contain a-z, A-Z, 0-9, spaces, and common symbols (e.g. - _ . / : @).'

export interface McpServerItem {
  id: string
  name: string
  transport: McpTransport
  command?: string
  args?: string[]
  env?: Record<string, string>
  url?: string
  headers?: Record<string, string>
  createdAt: string
  updatedAt: string
}

export interface CreateMcpServerPayload {
  name: string
  transport: McpTransport
  command?: string
  args?: string[]
  env?: Record<string, string>
  url?: string
  headers?: Record<string, string>
}

export interface UpdateMcpServerPayload extends CreateMcpServerPayload {
  id: string
}
