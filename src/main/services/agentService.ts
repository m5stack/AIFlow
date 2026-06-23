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
  AgentActiveDevice,
  ChatMessage
} from '../../shared/types'
import { formatPinMapsForPrompt, normalizeDeviceTypeForPinMap } from '../../shared/deviceInfo'
import { buildAgentSdkEnv } from '../agentEnv'
import { getClaudeExecutablePath } from '../claudeExecutablePath'
import { DEVICE_RESOURCE_RULES_CRITICAL, type ProjectService } from './projectService'
import type { UserModelService } from './userModelService'

type QueryHandle = {
  close(): void
  interrupt(): Promise<void>
  rewindFiles?(userMessageId: string, options?: { dryRun?: boolean }): Promise<unknown>
}

type PermissionWaiter = {
  resolve: (response: AgentPermissionResponse) => void
  timeout: NodeJS.Timeout
}

type AgentEventMap = {
  message: AgentMessageEvent
  activity: AgentActivityEvent
  permission: AgentPermissionRequest
  filesChanged: AgentFilesChangedEvent
  turnComplete: AgentTurnCompleteEvent
  error: AgentErrorEvent
}

type AgentEventSender = <K extends keyof AgentEventMap>(
  channel: K,
  payload: AgentEventMap[K]
) => void

const PERMISSION_TIMEOUT_MS = 5 * 60 * 1000
const AUTO_ALLOWED_FILE_TOOLS = new Set([
  'Read',
  'Edit',
  'MultiEdit',
  'Write',
  'Glob',
  'Grep',
  'LS'
])

const formatTimestamp = (): string =>
  new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })

const buildActiveDevicePrompt = (activeDevice?: AgentActiveDevice): string | undefined => {
  if (!activeDevice?.type) return undefined

  const normalizedType = normalizeDeviceTypeForPinMap(activeDevice.type)
  return [
    'Currently selected device:',
    `Device name: ${activeDevice.name}`,
    `Device type: ${activeDevice.type}`,
    formatPinMapsForPrompt(normalizedType)
  ].join('\n')
}

const buildTurnPrompt = (userPrompt: string, turnPromptPrefix: string): string =>
  `${turnPromptPrefix}\n\n[USER REQUEST]\n${userPrompt}`

const textFromContent = (content: unknown): string => {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .map((block) => {
      if (!block || typeof block !== 'object') return ''
      const maybeText = block as { type?: unknown; text?: unknown }
      return maybeText.type === 'text' && typeof maybeText.text === 'string' ? maybeText.text : ''
    })
    .filter(Boolean)
    .join('\n')
}

const reasoningFromContent = (content: unknown): string => {
  if (!Array.isArray(content)) return ''
  return content
    .map((block) => {
      if (!block || typeof block !== 'object') return ''
      const item = block as { type?: unknown; thinking?: unknown }
      if (item.type === 'thinking' && typeof item.thinking === 'string') return item.thinking
      if (item.type === 'redacted_thinking') return '[Reasoning redacted]'
      return ''
    })
    .filter(Boolean)
    .join('\n\n')
}

const summarizeContentBlocks = (content: unknown): string[] => {
  if (!Array.isArray(content)) return []
  return content.map((block) => {
    if (!block || typeof block !== 'object') return 'unknown'
    const item = block as { type?: unknown; name?: unknown }
    if (item.type === 'tool_use' && typeof item.name === 'string') return `tool_use:${item.name}`
    return typeof item.type === 'string' ? item.type : 'unknown'
  })
}

const isToolOnlyAssistantContent = (content: unknown): boolean => {
  if (!Array.isArray(content) || content.length === 0) return false
  return content.every((block) => {
    if (!block || typeof block !== 'object') return true
    const type = (block as { type?: unknown }).type
    return type === 'tool_use'
  })
}

type StreamState = {
  messageId: string
  reasoning: string
  content: string
  activeBlock: 'thinking' | 'text' | null
  lastEmitAt: number
  emitTimer?: ReturnType<typeof setTimeout>
  sessionId?: string
}

const STREAM_EMIT_INTERVAL_MS = 48

const extractToolPath = (toolName: string, input: Record<string, unknown>): string | undefined => {
  for (const key of ['file_path', 'path', 'notebook_path']) {
    const value = input[key]
    if (typeof value === 'string') return value
  }
  if (toolName === 'MultiEdit' && typeof input.file_path === 'string') return input.file_path
  return undefined
}

const FILE_EDIT_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit'])

/** Collect file paths touched by file-editing tool_use blocks in an assistant message. */
const changedPathsFromContent = (content: unknown): string[] => {
  if (!Array.isArray(content)) return []
  const paths: string[] = []
  for (const block of content) {
    if (!block || typeof block !== 'object') continue
    const item = block as { type?: unknown; name?: unknown; input?: unknown }
    if (item.type !== 'tool_use' || typeof item.name !== 'string') continue
    if (!FILE_EDIT_TOOLS.has(item.name)) continue
    const input =
      item.input && typeof item.input === 'object' ? (item.input as Record<string, unknown>) : {}
    const path = extractToolPath(item.name, input)
    if (path) paths.push(path)
  }
  return paths
}

export class AgentService {
  private readonly activeQueries = new Map<string, QueryHandle>()
  private readonly pendingPermissions = new Map<string, PermissionWaiter>()
  private readonly streamState = new Map<string, StreamState>()

  constructor(
    private readonly projectService: ProjectService,
    private readonly userModelService: UserModelService,
    private readonly sendEvent: AgentEventSender
  ) {}

  async startTurn(params: AgentStartTurnParams): Promise<{ turnId: string }> {
    const turnId = `turn-${Date.now()}-${Math.random().toString(16).slice(2)}`
    void this.runTurn(params)
    return { turnId }
  }

  respondPermission(response: AgentPermissionResponse): void {
    const waiter = this.pendingPermissions.get(response.requestId)
    if (!waiter) return
    clearTimeout(waiter.timeout)
    this.pendingPermissions.delete(response.requestId)
    waiter.resolve(response)
  }

  async interrupt(convId: string): Promise<void> {
    this.clearStreamState(convId)
    const query = this.activeQueries.get(convId)
    if (!query) return
    try {
      await query.interrupt()
    } finally {
      query.close()
      this.activeQueries.delete(convId)
    }
  }

  async rewindFiles(params: AgentRewindParams): Promise<AgentRewindResult> {
    const query = this.activeQueries.get(params.convId)
    if (!query?.rewindFiles)
      return { canRewind: false, error: 'No active agent session supports rewind.' }
    try {
      const result = await query.rewindFiles(params.userMessageId, { dryRun: params.dryRun })
      return { canRewind: true, changes: result }
    } catch (error) {
      return {
        canRewind: false,
        error: error instanceof Error ? error.message : 'Unknown rewind error.'
      }
    }
  }

  private async runTurn(params: AgentStartTurnParams): Promise<void> {
    this.activeQueries.get(params.convId)?.close()
    this.clearStreamState(params.convId)
    let currentQuery: (QueryHandle & AsyncIterable<unknown>) | undefined

    try {
      const [{ query }, conversation, modelCredentials] = await Promise.all([
        import('@anthropic-ai/claude-agent-sdk'),
        this.projectService.getConversation(params.projectId, params.convId),
        params.modelConfigId
          ? this.userModelService.getCredentials(params.modelConfigId)
          : undefined
      ])
      const model = modelCredentials?.model || params.model
      const activeDevicePrompt = buildActiveDevicePrompt(params.activeDevice)
      const turnContext = await this.projectService.getProjectTurnContext(params.projectId)
      const turnPrompt = buildTurnPrompt(params.prompt, turnContext.turnPromptPrefix)
      console.log('[agent] start turn', {
        projectId: params.projectId,
        convId: params.convId,
        model,
        baseUrl: modelCredentials?.baseUrl ?? 'default'
      })
      currentQuery = query({
        prompt: turnPrompt,
        options: {
          pathToClaudeCodeExecutable: getClaudeExecutablePath(),
          cwd: this.projectService.getProjectFilesRoot(params.projectId),
          additionalDirectories: [this.projectService.getBundledSkillsRoot()],
          resume: conversation.claudeSessionId,
          model,
          permissionMode: 'acceptEdits',
          disallowedTools: ['Bash'],
          skills: 'all',
          settingSources: ['project'],
          systemPrompt: {
            type: 'preset',
            preset: 'claude_code',
            append: [
              'You are running inside AIFlow.',
              'The current working directory is the active project files directory.',
              'When the user asks you to create or modify project files, use the available file editing tools directly.',
              'Do not tell the user to manually edit files unless a tool call fails with an unrecoverable error.',
              'Do not modify files outside the current working directory.',
              turnContext.systemFileTreePrompt,
              activeDevicePrompt,
              '=== CRITICAL RULES (override any conflicting path assumptions) ===',
              DEVICE_RESOURCE_RULES_CRITICAL
            ]
              .filter((line): line is string => Boolean(line))
              .join('\n')
          },
          enableFileCheckpointing: true,
          includePartialMessages: true,
          thinking: { type: 'adaptive' },
          env: buildAgentSdkEnv(modelCredentials),
          canUseTool: async (
            toolName: string,
            input: Record<string, unknown>,
            ctx: { toolUseID: string; title?: string; description?: string; blockedPath?: string }
          ) => {
            const requestedPath = extractToolPath(toolName, input)
            const isReadTool = AUTO_ALLOWED_FILE_TOOLS.has(toolName)
            if (requestedPath) {
              const allowed = isReadTool
                ? this.projectService.validateAgentReadPath(params.projectId, requestedPath)
                : this.projectService.validateProjectFilePath(params.projectId, requestedPath)
              if (!allowed) {
                return {
                  behavior: 'deny' as const,
                  message: 'The requested path is outside the current project.'
                }
              }
            }

            if (isReadTool) {
              return { behavior: 'allow' as const, updatedInput: input }
            }

            if (toolName === 'Bash') {
              return {
                behavior: 'deny' as const,
                message: 'Bash is disabled for project chat in this version.'
              }
            }

            const response = await this.requestPermission({
              requestId: ctx.toolUseID,
              projectId: params.projectId,
              convId: params.convId,
              toolName,
              input,
              title: ctx.title,
              description: ctx.description,
              blockedPath: ctx.blockedPath
            })

            return response.behavior === 'allow'
              ? { behavior: 'allow' as const, updatedInput: input }
              : {
                  behavior: 'deny' as const,
                  message: response.message || 'User denied permission.'
                }
          }
        }
      }) as QueryHandle & AsyncIterable<unknown>

      this.activeQueries.set(params.convId, currentQuery)

      let sessionId: string | undefined
      for await (const sdkMessage of currentQuery) {
        const message = sdkMessage as Record<string, unknown>
        console.log('[agent] message', {
          type: message.type,
          subtype: message.subtype,
          eventType:
            message.type === 'stream_event'
              ? (message.event as { type?: unknown } | undefined)?.type
              : undefined,
          deltaType:
            message.type === 'stream_event' &&
            (message.event as { type?: unknown } | undefined)?.type === 'content_block_delta'
              ? ((message.event as { delta?: { type?: unknown } }).delta?.type ?? undefined)
              : undefined,
          blockType:
            message.type === 'stream_event' &&
            (message.event as { type?: unknown } | undefined)?.type === 'content_block_start'
              ? ((message.event as { content_block?: { type?: unknown } }).content_block?.type ??
                undefined)
              : undefined,
          sessionId: typeof message.session_id === 'string' ? message.session_id : undefined
        })
        sessionId = typeof message.session_id === 'string' ? message.session_id : sessionId
        if (sessionId)
          await this.projectService.updateConversationSession(
            params.projectId,
            params.convId,
            sessionId
          )
        await this.handleSdkMessage(params, message)
      }

      this.sendEvent('turnComplete', {
        projectId: params.projectId,
        convId: params.convId,
        sessionId
      })
    } catch (error) {
      this.sendEvent('error', {
        projectId: params.projectId,
        convId: params.convId,
        code: 'agent_turn_failed',
        message: error instanceof Error ? error.message : 'Unknown agent error.'
      })
    } finally {
      if (currentQuery && this.activeQueries.get(params.convId) === currentQuery) {
        this.activeQueries.delete(params.convId)
      }
    }
  }

  private sendActivity(params: AgentStartTurnParams, label: string): void {
    this.sendEvent('activity', {
      projectId: params.projectId,
      convId: params.convId,
      label
    })
  }

  private getStreamState(convId: string): StreamState {
    const existing = this.streamState.get(convId)
    if (existing) return existing
    const created: StreamState = {
      messageId: `stream-${Date.now()}`,
      reasoning: '',
      content: '',
      activeBlock: null,
      lastEmitAt: 0
    }
    this.streamState.set(convId, created)
    return created
  }

  private clearStreamState(convId: string): void {
    const state = this.streamState.get(convId)
    if (state?.emitTimer) clearTimeout(state.emitTimer)
    this.streamState.delete(convId)
  }

  private flushStreamingMessage(params: AgentStartTurnParams): void {
    const state = this.streamState.get(params.convId)
    if (!state || (!state.reasoning.trim() && !state.content.trim())) return

    state.lastEmitAt = Date.now()
    const chatMessage: ChatMessage = {
      id: state.messageId,
      role: 'assistant',
      content: state.content,
      reasoning: state.reasoning.trim() || undefined,
      timestamp: formatTimestamp(),
      isStreaming: true
    }
    console.log('[agent] chat emit (partial)', {
      convId: params.convId,
      messageId: chatMessage.id,
      contentLen: chatMessage.content.length,
      reasoningLen: chatMessage.reasoning?.length ?? 0
    })
    this.sendEvent('message', {
      projectId: params.projectId,
      convId: params.convId,
      message: chatMessage,
      sessionId: state.sessionId
    })
  }

  private async persistChatMessage(
    params: AgentStartTurnParams,
    chatMessage: ChatMessage,
    sessionId: string | undefined,
    logLabel: string
  ): Promise<void> {
    console.log(`[agent] chat emit (${logLabel})`, {
      convId: params.convId,
      messageId: chatMessage.id,
      contentLen: chatMessage.content.length,
      reasoningLen: chatMessage.reasoning?.length ?? 0,
      preview: chatMessage.content.slice(0, 80) || chatMessage.reasoning?.slice(0, 80) || '(empty)'
    })
    await this.projectService.appendConversationMessages(params.projectId, params.convId, [
      chatMessage
    ])
    this.sendEvent('message', {
      projectId: params.projectId,
      convId: params.convId,
      message: chatMessage,
      sessionId
    })
  }

  private async finalizeStreamMessage(
    params: AgentStartTurnParams,
    sessionId: string | undefined
  ): Promise<void> {
    const state = this.streamState.get(params.convId)
    if (!state) return
    if (state.emitTimer) {
      clearTimeout(state.emitTimer)
      state.emitTimer = undefined
    }

    const content = state.content.trim()
    const reasoning = state.reasoning.trim()
    if (!content && !reasoning) return

    const chatMessage: ChatMessage = {
      id: state.messageId,
      role: 'assistant',
      content,
      reasoning: reasoning || undefined,
      timestamp: formatTimestamp(),
      isStreaming: false
    }
    this.clearStreamState(params.convId)
    await this.persistChatMessage(params, chatMessage, sessionId ?? state.sessionId, 'stream_stop')
  }

  private scheduleStreamingEmit(params: AgentStartTurnParams): void {
    const state = this.streamState.get(params.convId)
    if (!state) return

    const elapsed = Date.now() - state.lastEmitAt
    if (elapsed >= STREAM_EMIT_INTERVAL_MS) {
      this.flushStreamingMessage(params)
      return
    }

    if (state.emitTimer) return
    state.emitTimer = setTimeout(() => {
      state.emitTimer = undefined
      this.flushStreamingMessage(params)
    }, STREAM_EMIT_INTERVAL_MS - elapsed)
  }

  private handleStreamEvent(params: AgentStartTurnParams, message: Record<string, unknown>): void {
    const event = message.event as Record<string, unknown> | undefined
    const sessionId = typeof message.session_id === 'string' ? message.session_id : undefined
    if (!event?.type) return

    if (event.type === 'message_start') {
      const sdkMessage = event.message as { id?: unknown } | undefined
      const messageId = typeof sdkMessage?.id === 'string' ? sdkMessage.id : `stream-${Date.now()}`
      const prev = this.streamState.get(params.convId)
      if (prev?.emitTimer) clearTimeout(prev.emitTimer)
      this.streamState.set(params.convId, {
        messageId,
        reasoning: '',
        content: '',
        activeBlock: null,
        lastEmitAt: 0,
        sessionId
      })
      console.log('[agent] stream start', { convId: params.convId, messageId })
      this.sendActivity(params, 'Waiting for model…')
      return
    }

    const state = this.getStreamState(params.convId)
    if (sessionId) state.sessionId = sessionId

    if (event.type === 'content_block_start') {
      const block = event.content_block as { type?: unknown; name?: unknown } | undefined
      if (block?.type === 'thinking') {
        state.activeBlock = 'thinking'
        this.sendActivity(params, 'Reasoning…')
      } else if (block?.type === 'text') {
        state.activeBlock = 'text'
        this.sendActivity(params, 'Generating reply…')
      } else if (block?.type === 'tool_use' && typeof block.name === 'string') {
        state.activeBlock = null
        this.sendActivity(params, `Calling ${block.name}…`)
      } else {
        state.activeBlock = null
      }
      console.log('[agent] stream block start', {
        convId: params.convId,
        blockType: block?.type,
        toolName: block?.type === 'tool_use' ? block.name : undefined
      })
      return
    }

    if (event.type === 'content_block_stop') {
      state.activeBlock = null
      this.scheduleStreamingEmit(params)
      return
    }

    if (event.type === 'message_stop') {
      void this.finalizeStreamMessage(params, sessionId)
      return
    }

    if (event.type === 'content_block_delta') {
      const delta = event.delta as Record<string, unknown> | undefined
      if (delta?.type === 'thinking_delta' && typeof delta.thinking === 'string') {
        state.reasoning += delta.thinking
        this.scheduleStreamingEmit(params)
      } else if (delta?.type === 'text_delta' && typeof delta.text === 'string') {
        state.content += delta.text
        this.scheduleStreamingEmit(params)
      }
    }
  }

  private async handleSdkMessage(
    params: AgentStartTurnParams,
    message: Record<string, unknown>
  ): Promise<void> {
    const sessionId = typeof message.session_id === 'string' ? message.session_id : undefined

    if (message.type === 'stream_event') {
      this.handleStreamEvent(params, message)
      return
    }

    if (message.type === 'assistant') {
      const betaMessage = message.message as { content?: unknown } | undefined
      const streamState = this.streamState.get(params.convId)
      const blockSummary = summarizeContentBlocks(betaMessage?.content)
      if (streamState?.emitTimer) {
        clearTimeout(streamState.emitTimer)
        streamState.emitTimer = undefined
      }

      const changedPaths = changedPathsFromContent(betaMessage?.content)
      if (changedPaths.length > 0) {
        console.log('[agent] files changed (tool_use)', {
          projectId: params.projectId,
          convId: params.convId,
          paths: changedPaths
        })
        this.sendEvent('filesChanged', {
          projectId: params.projectId,
          convId: params.convId,
          paths: changedPaths
        })
      }

      const messageText = textFromContent(betaMessage?.content)
      const messageReasoning = reasoningFromContent(betaMessage?.content)
      const content = messageText || streamState?.content || ''
      const reasoning = messageReasoning || streamState?.reasoning || ''
      const messageId =
        streamState?.messageId ??
        (typeof message.uuid === 'string' ? message.uuid : `assistant-${Date.now()}`)

      if (!content.trim() && !reasoning.trim()) {
        console.log('[agent] chat skip (no text/thinking yet)', {
          convId: params.convId,
          messageId,
          blockSummary,
          toolOnly: isToolOnlyAssistantContent(betaMessage?.content)
        })
        return
      }

      this.clearStreamState(params.convId)

      const chatMessage: ChatMessage = {
        id: messageId,
        role: 'assistant',
        content,
        reasoning: reasoning.trim() || undefined,
        timestamp: formatTimestamp(),
        isStreaming: false
      }
      await this.persistChatMessage(params, chatMessage, sessionId, 'assistant')
      return
    }

    if (message.type === 'tool_progress') {
      const toolName = typeof message.tool_name === 'string' ? message.tool_name : 'tool'
      const elapsed =
        typeof message.elapsed_time_seconds === 'number'
          ? Math.max(1, Math.round(message.elapsed_time_seconds))
          : undefined
      this.sendActivity(
        params,
        elapsed != null ? `${toolName} running (${elapsed}s)…` : `${toolName} running…`
      )
      return
    }

    if (message.type === 'system' && message.subtype === 'status') {
      if (message.status === 'requesting') this.sendActivity(params, 'Requesting model…')
      else if (message.status === 'compacting') this.sendActivity(params, 'Compacting context…')
      return
    }

    if (message.type === 'system' && message.subtype === 'files_persisted') {
      const files = Array.isArray(message.files) ? message.files : []
      const paths = files
        .map((file) => {
          if (!file || typeof file !== 'object') return ''
          const item = file as { filename?: unknown }
          return typeof item.filename === 'string' ? item.filename : ''
        })
        .filter(Boolean)
      console.log('[agent] files changed', {
        projectId: params.projectId,
        convId: params.convId,
        paths
      })
      this.sendEvent('filesChanged', { projectId: params.projectId, convId: params.convId, paths })
      return
    }

    if (message.type === 'result') {
      this.sendEvent('turnComplete', {
        projectId: params.projectId,
        convId: params.convId,
        sessionId: typeof message.session_id === 'string' ? message.session_id : undefined,
        result: typeof message.result === 'string' ? message.result : undefined,
        totalCostUsd:
          typeof message.total_cost_usd === 'number' ? message.total_cost_usd : undefined
      })
    }
  }

  private requestPermission(request: AgentPermissionRequest): Promise<AgentPermissionResponse> {
    this.sendEvent('permission', request)
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.pendingPermissions.delete(request.requestId)
        resolve({
          requestId: request.requestId,
          behavior: 'deny',
          message: 'Permission request timed out.'
        })
      }, PERMISSION_TIMEOUT_MS)
      this.pendingPermissions.set(request.requestId, { resolve, timeout })
    })
  }
}
