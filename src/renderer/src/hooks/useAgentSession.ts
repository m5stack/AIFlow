import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { toast } from '@heroui/react'
import { createUserChatMessage, flushPendingProjectFileWrite, useProjectStore } from '../stores/projectStore'
import { useDeviceStore } from '../stores/deviceStore'
import { groupMessagesIntoTurns, mergeAssistantParts } from '../utils/conversation/chatTurns'
import type {
  CreateUserModelConfigPayload,
  UpdateUserModelConfigPayload,
  UserModelConfig
} from '../../../shared/types'
import type { ChatModelOption } from '../types/model'

export function useAgentSession() {
  const {
    projects,
    activeProjectId,
    selectedConvByProject,
    setSelectedConv,
    addConversation,
    deleteConversation,
    renameConversation,
    appendConversationMessages,
    setTurnDuration,
    autoRunGeneratedCode,
    handleAgentMessage,
    handleAgentFilesChanged,
    reloadActiveCodeFile,
    setShowNewProjectDialog
  } = useProjectStore()

  const activeProject = projects.find((p) => p.id === activeProjectId)
  const conversations = activeProject?.conversations || []
  const selectedConvId = activeProjectId ? selectedConvByProject[activeProjectId] : undefined
  const selectedConv = conversations.find((c) => c.id === selectedConvId) || conversations[0]
  const messages = selectedConv?.messages ?? []

  const [userModels, setUserModels] = useState<UserModelConfig[]>([])
  const [selectedModel, setSelectedModel] = useState('')
  const [thinkingByConvId, setThinkingByConvId] = useState<Record<string, boolean>>({})
  const [thinkingStartedAtByConvId, setThinkingStartedAtByConvId] = useState<
    Record<string, number>
  >({})
  const [interruptingByConvId, setInterruptingByConvId] = useState<Record<string, boolean>>({})
  const [activityByConvId, setActivityByConvId] = useState<Record<string, string>>({})

  const tabsScrollRef = useRef<HTMLDivElement>(null)
  const thinkingMetaRef = useRef<Record<string, { startedAt: number; turnId: string }>>({})
  const filesChangedByConvIdRef = useRef<Record<string, boolean>>({})

  const isThinking = selectedConvId ? (thinkingByConvId[selectedConvId] ?? false) : false
  const thinkingStartedAt = selectedConvId ? thinkingStartedAtByConvId[selectedConvId] : undefined
  const isInterrupting = selectedConvId ? (interruptingByConvId[selectedConvId] ?? false) : false
  const hasNoProject = projects.length === 0 || !activeProjectId
  const isEmptyConversation = !hasNoProject && messages.length === 0 && !isThinking
  const chatTurns = useMemo(() => groupMessagesIntoTurns(messages), [messages])
  const hasStreamingAssistant = messages.some(
    (message) => message.role === 'assistant' && message.isStreaming
  )
  const activityLabel = selectedConvId ? activityByConvId[selectedConvId] : undefined
  const autoScrollActive = isThinking || hasStreamingAssistant

  const modelOptions: ChatModelOption[] = userModels.map((model) => ({
    ...model,
    isUserModel: true
  }))

  const startThinkingTurn = useCallback((convId: string, turnId: string) => {
    const startedAt = Date.now()
    thinkingMetaRef.current[convId] = { startedAt, turnId }
    setThinkingStartedAtByConvId((prev) => ({ ...prev, [convId]: startedAt }))
  }, [])

  const finishThinkingTurn = useCallback(
    (projectId: string, convId: string) => {
      const meta = thinkingMetaRef.current[convId]
      if (meta) {
        void setTurnDuration(projectId, convId, meta.turnId, Date.now() - meta.startedAt)
        delete thinkingMetaRef.current[convId]
      }
      setThinkingStartedAtByConvId((prev) => {
        if (!(convId in prev)) return prev
        const next = { ...prev }
        delete next[convId]
        return next
      })
    },
    [setTurnDuration]
  )

  useEffect(() => {
    void window.ipc.model
      .list()
      .then((models) => {
        setUserModels(models)
        setSelectedModel((prev) => {
          if (prev && models.some((model) => model.id === prev)) return prev
          return models[0]?.id ?? ''
        })
      })
      .catch((error) => {
        toast.danger(
          `Failed to load models: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      })
  }, [])

  useEffect(() => {
    const offMessage = window.ipc.agent.onMessage((event) => {
      handleAgentMessage(event.projectId, event.convId, event.message)
    })
    const offActivity = window.ipc.agent.onActivity((event) => {
      setActivityByConvId((prev) => ({ ...prev, [event.convId]: event.label }))
    })
    const offFilesChanged = window.ipc.agent.onFilesChanged((event) => {
      if (event.paths.length > 0) {
        filesChangedByConvIdRef.current[event.convId] = true
      }
      void handleAgentFilesChanged(event.projectId, event.paths)
    })
    const offTurnComplete = window.ipc.agent.onTurnComplete((event) => {
      const userMessageId = thinkingMetaRef.current[event.convId]?.turnId
      finishThinkingTurn(event.projectId, event.convId)
      setThinkingByConvId((prev) => ({ ...prev, [event.convId]: false }))
      setInterruptingByConvId((prev) => ({ ...prev, [event.convId]: false }))
      setActivityByConvId((prev) => {
        if (!(event.convId in prev)) return prev
        const next = { ...prev }
        delete next[event.convId]
        return next
      })
      const generatedCode = filesChangedByConvIdRef.current[event.convId] === true
      delete filesChangedByConvIdRef.current[event.convId]
      if (generatedCode) {
        void reloadActiveCodeFile(event.projectId)
        if (userMessageId) {
          void autoRunGeneratedCode(event.projectId, event.convId, userMessageId)
        }
      }
    })
    const offError = window.ipc.agent.onError((event) => {
      if (event.convId) {
        if (event.projectId) finishThinkingTurn(event.projectId, event.convId)
        setThinkingByConvId((prev) => ({ ...prev, [event.convId as string]: false }))
        setInterruptingByConvId((prev) => ({ ...prev, [event.convId as string]: false }))
        setActivityByConvId((prev) => {
          const convId = event.convId as string
          if (!(convId in prev)) return prev
          const next = { ...prev }
          delete next[convId]
          return next
        })
      }
      toast.danger(`Claude failed: ${event.message}`)
    })
    const offPermission = window.ipc.agent.onPermission((event) => {
      const allowed = window.confirm(event.title || `${event.toolName} wants permission.`)
      void window.ipc.agent.respondPermission({
        requestId: event.requestId,
        behavior: allowed ? 'allow' : 'deny',
        message: allowed ? undefined : 'User denied permission.'
      })
    })

    return () => {
      offMessage()
      offActivity()
      offFilesChanged()
      offTurnComplete()
      offError()
      offPermission()
    }
  }, [
    autoRunGeneratedCode,
    finishThinkingTurn,
    handleAgentFilesChanged,
    handleAgentMessage,
    reloadActiveCodeFile
  ])

  useEffect(() => {
    if (!selectedConvId) return
    const frame = requestAnimationFrame(() => {
      const tabEl = tabsScrollRef.current?.querySelector<HTMLElement>(
        `[data-conv-id="${selectedConvId}"]`
      )
      tabEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
    })
    return () => cancelAnimationFrame(frame)
  }, [selectedConvId, conversations.length])

  const handleSend = (content: string): void => {
    if (!activeProjectId || !selectedConvId) return
    if (!selectedModel) return

    const convId = selectedConvId
    const projectId = activeProjectId
    const activeDeviceId = activeProject?.activeDeviceId
    const poolDevice = useDeviceStore
      .getState()
      .devices.find((device) => device.id === activeDeviceId)
    const activeDevice = poolDevice
      ? { id: poolDevice.id, name: poolDevice.name, type: poolDevice.type }
      : undefined
    const userMsg = createUserChatMessage(content)

    filesChangedByConvIdRef.current[convId] = false
    setActivityByConvId((prev) => ({ ...prev, [convId]: 'Starting…' }))
    void appendConversationMessages(projectId, convId, [userMsg])
    startThinkingTurn(convId, userMsg.id)
    setThinkingByConvId((prev) => ({ ...prev, [convId]: true }))
    setInterruptingByConvId((prev) => ({ ...prev, [convId]: false }))
    void flushPendingProjectFileWrite().then(() =>
      window.ipc.agent
        .startTurn({
          projectId,
          convId,
          prompt: content,
          activeDevice,
          modelConfigId: selectedModel
        })
        .catch((error) => {
          finishThinkingTurn(projectId, convId)
          setThinkingByConvId((prev) => ({ ...prev, [convId]: false }))
          toast.danger(`Claude failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        })
    )
  }

  const handleInterrupt = (): void => {
    if (!activeProjectId || !selectedConvId || !isThinking) return
    const convId = selectedConvId
    const projectId = activeProjectId
    setInterruptingByConvId((prev) => ({ ...prev, [convId]: true }))
    void window.ipc.agent
      .interrupt(convId)
      .then(() => {
        finishThinkingTurn(projectId, convId)
        setThinkingByConvId((prev) => ({ ...prev, [convId]: false }))
      })
      .catch((error) => {
        toast.danger(`Stop failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      })
      .finally(() => {
        setInterruptingByConvId((prev) => ({ ...prev, [convId]: false }))
      })
  }

  const handleAddModel = async (payload: CreateUserModelConfigPayload): Promise<void> => {
    try {
      const model = await window.ipc.model.create(payload)
      setUserModels((prev) => [model, ...prev])
      setSelectedModel(model.id)
      toast.success('Model added.')
    } catch (error) {
      toast.danger(
        `Failed to add model: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      throw error
    }
  }

  const handleUpdateModel = async (
    modelId: string,
    payload: UpdateUserModelConfigPayload
  ): Promise<UserModelConfig> => {
    try {
      const model = await window.ipc.model.update(modelId, payload)
      setUserModels((prev) => prev.map((item) => (item.id === modelId ? model : item)))
      setSelectedModel(model.id)
      toast.success('Model updated.')
      return model
    } catch (error) {
      toast.danger(
        `Failed to update model: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      throw error
    }
  }

  const handleDeleteModel = async (modelId: string): Promise<void> => {
    try {
      await window.ipc.model.delete(modelId)
      setUserModels((prev) => {
        const next = prev.filter((item) => item.id !== modelId)
        if (selectedModel === modelId) {
          setSelectedModel(next[0]?.id ?? '')
        }
        return next
      })
      toast.success('Model deleted.')
    } catch (error) {
      toast.danger(
        `Failed to delete model: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      throw error
    }
  }

  const handleAddConversation = (): void => {
    if (!activeProjectId) return
    void addConversation(activeProjectId)
  }

  const chatInputProps = {
    onSend: handleSend,
    disabled: isThinking || !selectedConvId || hasNoProject,
    isThinking,
    isInterrupting,
    models: modelOptions,
    selectedModel,
    onModelChange: setSelectedModel,
    onAddModel: handleAddModel,
    onUpdateModel: handleUpdateModel,
    onDeleteModel: handleDeleteModel,
    onInterrupt: handleInterrupt
  }

  return {
    activeProjectId,
    conversations,
    selectedConv,
    selectedConvId,
    messages,
    chatTurns,
    hasNoProject,
    isEmptyConversation,
    isThinking,
    thinkingStartedAt,
    activityLabel,
    autoScrollActive,
    tabsScrollRef,
    chatInputProps,
    setSelectedConv,
    deleteConversation,
    renameConversation,
    handleAddConversation,
    setShowNewProjectDialog,
    mergeAssistantParts
  }
}

export type AgentSession = ReturnType<typeof useAgentSession>
