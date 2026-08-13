import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { toast } from '@heroui/react'
import {
  createUserChatMessage,
  flushPendingProjectFileWrite,
  useProjectStore
} from '../stores/projectStore'
import { useFlowStatusStore } from '../stores/flowStatusStore'
import { useSessionTokenUsageStore } from '../stores/sessionTokenUsageStore'
import { useDeviceStore } from '../stores/deviceStore'
import { useDeviceFileTreeStore } from '../stores/deviceFileTreeStore'
import { useOnboardingStore } from '../stores/onboardingStore'
import { formatDeviceFileTree } from '../utils/device/formatDeviceFileTree'
import { groupMessagesIntoTurns, mergeAssistantParts } from '../utils/conversation/chatTurns'
import type {
  AgentActiveDevice,
  AgentPermissionRequest,
  ChatImageAttachment,
  CreateUserModelConfigPayload,
  UpdateUserModelConfigPayload,
  UserModelConfig
} from '../../../shared/types'
import type { ChatModelOption } from '../types/model'

const NEW_CHAT_TITLE_PATTERN = /^New chat(?: \d+)?$/

export function useAgentSession() {
  const {
    projects,
    activeProjectId,
    selectedConvByProject,
    setSelectedConv,
    addConversation,
    deleteConversation,
    renameConversation,
    setConversationPromptTemplate,
    generateConversationTitle,
    appendConversationMessages,
    setTurnDuration,
    applyTurnTokenUsage,
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
  const [permissionQueue, setPermissionQueue] = useState<AgentPermissionRequest[]>([])

  const tabsScrollRef = useRef<HTMLDivElement>(null)
  const thinkingMetaRef = useRef<Record<string, { startedAt: number; turnId: string }>>({})
  const filesChangedByConvIdRef = useRef<Record<string, boolean>>({})
  const pendingTitleByConvIdRef = useRef<
    Record<string, { projectId: string; modelConfigId: string }>
  >({})

  const onboardingOpen = useOnboardingStore((s) => s.isOpen)
  const prevOnboardingOpenRef = useRef(onboardingOpen)

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
  const setAi = useFlowStatusStore((s) => s.setAi)
  const activePermission = permissionQueue[0] ?? null

  const respondPermission = useCallback((behavior: 'allow' | 'deny') => {
    setPermissionQueue((queue) => {
      const request = queue[0]
      if (!request) return queue
      void window.ipc.agent.respondPermission({
        requestId: request.requestId,
        behavior,
        message: behavior === 'deny' ? 'User denied permission.' : undefined
      })
      return queue.slice(1)
    })
  }, [])

  useEffect(() => {
    setAi(isThinking || hasStreamingAssistant)
  }, [isThinking, hasStreamingAssistant, setAi])

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

  const reloadModels = useCallback(() => {
    return window.ipc.model
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
    void reloadModels()
  }, [reloadModels])

  useEffect(() => {
    const wasOpen = prevOnboardingOpenRef.current
    prevOnboardingOpenRef.current = onboardingOpen
    if (wasOpen && !onboardingOpen) {
      void reloadModels()
    }
  }, [onboardingOpen, reloadModels])

  useEffect(() => {
    const offMessage = window.ipc.agent.onMessage((event) => {
      handleAgentMessage(event.projectId, event.convId, event.message)
    })
    const offActivity = window.ipc.agent.onActivity((event) => {
      setActivityByConvId((prev) => ({ ...prev, [event.convId]: event.label }))
    })
    const offFilesChanged = window.ipc.agent.onFilesChanged((event) => {
      if (event.paths.length > 0 && event.autoRunEligible !== false) {
        filesChangedByConvIdRef.current[event.convId] = true
      }
      void handleAgentFilesChanged(event.projectId, event.paths, {
        pulseCode: event.autoRunEligible !== false
      })
    })
    const offTurnComplete = window.ipc.agent.onTurnComplete((event) => {
      const userMessageId = thinkingMetaRef.current[event.convId]?.turnId
      finishThinkingTurn(event.projectId, event.convId)
      if (event.tokenUsage) {
        useSessionTokenUsageStore.getState().addUsage(event.tokenUsage)
      }
      if (userMessageId && event.tokenUsage) {
        applyTurnTokenUsage(event.projectId, event.convId, userMessageId, event.tokenUsage)
      }
      setThinkingByConvId((prev) => ({ ...prev, [event.convId]: false }))
      setInterruptingByConvId((prev) => ({ ...prev, [event.convId]: false }))
      setActivityByConvId((prev) => {
        if (!(event.convId in prev)) return prev
        const next = { ...prev }
        delete next[event.convId]
        return next
      })
      const pendingTitle = pendingTitleByConvIdRef.current[event.convId]
      if (pendingTitle) {
        delete pendingTitleByConvIdRef.current[event.convId]
        const currentConversation = useProjectStore
          .getState()
          .projects.find((project) => project.id === pendingTitle.projectId)
          ?.conversations.find((conversation) => conversation.id === event.convId)
        if (currentConversation && NEW_CHAT_TITLE_PATTERN.test(currentConversation.title.trim())) {
          void generateConversationTitle({
            projectId: pendingTitle.projectId,
            convId: event.convId,
            modelConfigId: pendingTitle.modelConfigId
          })
        }
      }
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
      setPermissionQueue((queue) => [...queue, event])
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
    applyTurnTokenUsage,
    finishThinkingTurn,
    generateConversationTitle,
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

  const handleSend = (content: string, images: ChatImageAttachment[]): void => {
    if (!activeProjectId || !selectedConvId) return
    if (!selectedModel) return

    const convId = selectedConvId
    const projectId = activeProjectId
    const activeDeviceId = activeProject?.activeDeviceId
    const poolDevice = useDeviceStore
      .getState()
      .devices.find((device) => device.id === activeDeviceId)
    let activeDevice: AgentActiveDevice | undefined = poolDevice
      ? { id: poolDevice.id, name: poolDevice.name, type: poolDevice.type }
      : undefined
    if (poolDevice) {
      const snapshot = useDeviceFileTreeStore.getState()
      if (snapshot.deviceId === poolDevice.id && snapshot.tree) {
        activeDevice = {
          id: poolDevice.id,
          name: poolDevice.name,
          type: poolDevice.type,
          fileTreeText: formatDeviceFileTree(snapshot.tree, snapshot.rootFsPath),
          fileTreeRoot: snapshot.rootFsPath
        }
      }
    }
    const userMsg = createUserChatMessage(content, images)

    if (
      selectedConv &&
      NEW_CHAT_TITLE_PATTERN.test(selectedConv.title.trim()) &&
      !pendingTitleByConvIdRef.current[convId]
    ) {
      pendingTitleByConvIdRef.current[convId] = {
        projectId,
        modelConfigId: selectedModel
      }
    }

    filesChangedByConvIdRef.current[convId] = false
    setActivityByConvId((prev) => ({ ...prev, [convId]: 'Starting…' }))
    startThinkingTurn(convId, userMsg.id)
    setThinkingByConvId((prev) => ({ ...prev, [convId]: true }))
    setInterruptingByConvId((prev) => ({ ...prev, [convId]: false }))
    void Promise.all([
      appendConversationMessages(projectId, convId, [userMsg]),
      flushPendingProjectFileWrite()
    ])
      .then(() =>
        window.ipc.agent.startTurn({
          projectId,
          convId,
          prompt: content,
          images,
          activeDevice,
          modelConfigId: selectedModel
        })
      )
      .catch((error) => {
        finishThinkingTurn(projectId, convId)
        setThinkingByConvId((prev) => ({ ...prev, [convId]: false }))
        toast.danger(`Claude failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      })
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

  const handlePromptTemplateChange = async (promptTemplateId?: string): Promise<void> => {
    if (!activeProjectId || !selectedConvId) return
    await setConversationPromptTemplate(activeProjectId, selectedConvId, promptTemplateId)
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

  const promptTemplateProps = {
    activeTemplateId: selectedConv?.activePromptTemplateId,
    onActiveTemplateChange: handlePromptTemplateChange
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
    promptTemplateProps,
    setSelectedConv,
    deleteConversation,
    renameConversation,
    handleAddConversation,
    setShowNewProjectDialog,
    mergeAssistantParts,
    activePermission,
    respondPermission
  }
}

export type AgentSession = ReturnType<typeof useAgentSession>
