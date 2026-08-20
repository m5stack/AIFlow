import React, { useCallback, useEffect, useRef, useState } from 'react'
import ConversationInput from './ConversationInput'
import ConversationModelSelector, {
  type ConversationModelSelectorHandle
} from './ConversationModelSelector'
import TokenUsageDashboardDialog from './TokenUsageDashboardDialog'
import { ChartIcon, LightbulbIcon } from '../icons/Icons'
import type { AgentSession } from '../../hooks/useAgentSession'
import type { ChatImageAttachment } from '../../types/chat'

interface ConversationComposerProps {
  session: AgentSession
}

interface ConversationDraft {
  value: string
  images: ChatImageAttachment[]
}

const EMPTY_DRAFT: ConversationDraft = { value: '', images: [] }

export default function ConversationComposer({
  session
}: ConversationComposerProps): React.JSX.Element {
  const { activeProjectId, conversations, hasNoProject, selectedConvId, chatInputProps } = session
  const {
    models,
    selectedModel,
    onModelChange,
    onAddModel,
    onUpdateModel,
    onDeleteModel,
    disabled,
    ...restChatInputProps
  } = chatInputProps
  const modelSelectorRef = useRef<ConversationModelSelectorHandle>(null)
  const [isUsageDialogOpen, setIsUsageDialogOpen] = useState(false)
  const [draftsByConversation, setDraftsByConversation] = useState<
    Record<string, ConversationDraft>
  >({})
  const draftKey = activeProjectId && selectedConvId ? `${activeProjectId}:${selectedConvId}` : ''
  const draft = (draftKey && draftsByConversation[draftKey]) || EMPTY_DRAFT

  useEffect(() => {
    if (!activeProjectId) return
    const projectPrefix = `${activeProjectId}:`
    const currentDraftKeys = new Set(
      conversations.map((conversation) => `${activeProjectId}:${conversation.id}`)
    )
    const frame = requestAnimationFrame(() => {
      setDraftsByConversation((current) => {
        const staleKeys = Object.keys(current).filter(
          (key) => key.startsWith(projectPrefix) && !currentDraftKeys.has(key)
        )
        if (staleKeys.length === 0) return current
        const next = { ...current }
        staleKeys.forEach((key) => delete next[key])
        return next
      })
    })
    return () => cancelAnimationFrame(frame)
  }, [activeProjectId, conversations])

  const updateDraft = useCallback(
    (update: (current: ConversationDraft) => ConversationDraft): void => {
      if (!draftKey) return
      setDraftsByConversation((current) => {
        const nextDraft = update(current[draftKey] ?? EMPTY_DRAFT)
        if (!nextDraft.value && nextDraft.images.length === 0) {
          if (!(draftKey in current)) return current
          const next = { ...current }
          delete next[draftKey]
          return next
        }
        return { ...current, [draftKey]: nextDraft }
      })
    },
    [draftKey]
  )

  const handleValueChange = useCallback(
    (value: string): void => updateDraft((current) => ({ ...current, value })),
    [updateDraft]
  )

  const handleImagesChange = useCallback(
    (images: ChatImageAttachment[]): void => updateDraft((current) => ({ ...current, images })),
    [updateDraft]
  )

  return (
    <section className="flex shrink-0 flex-col overflow-hidden border-t bg-surface/95 shadow-[var(--panel-shadow)]">
      <header className="flex h-9 shrink-0 items-center justify-between gap-3 border-b bg-surface-2 px-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex size-[18px] shrink-0 items-center justify-center">
            <LightbulbIcon size={16} />
          </span>
          <span className="truncate text-[15px] font-bold leading-[18px]">Your Idea</span>
        </div>
        <div className="flex min-w-0 items-center gap-1">
          <ConversationModelSelector
            ref={modelSelectorRef}
            models={models}
            selectedModel={selectedModel}
            onModelChange={onModelChange}
            onAddModel={onAddModel}
            onUpdateModel={onUpdateModel}
            onDeleteModel={onDeleteModel}
            disabled={hasNoProject || disabled}
          />
          <button
            type="button"
            className="flex size-7 items-center justify-center rounded text-muted transition-colors hover:bg-soft hover:text-ink"
            title="Token usage"
            aria-label="Token usage"
            onClick={() => setIsUsageDialogOpen(true)}
          >
            <ChartIcon size={12} />
          </button>
        </div>
      </header>
      <TokenUsageDashboardDialog
        isOpen={isUsageDialogOpen}
        onClose={() => setIsUsageDialogOpen(false)}
      />
      <div className="flex min-h-0 flex-col gap-2 overflow-hidden">
        <div className="flex min-h-[120px] flex-col overflow-hidden bg-transparent">
          {/*
            Previous prompt-template entry:
            toolbarActions={
              <ConversationPromptSelector
                {...promptTemplateProps}
                disabled={hasNoProject || disabled}
              />
            }
            Restore ConversationInput.toolbarActions and its related imports/props before re-enabling it.
          */}
          <ConversationInput
            key={session.selectedConvId ?? 'no-conversation'}
            {...restChatInputProps}
            value={draft.value}
            images={draft.images}
            onValueChange={handleValueChange}
            onImagesChange={handleImagesChange}
            models={models}
            selectedModel={selectedModel}
            onNeedModel={() => modelSelectorRef.current?.openCreateDialog()}
            variant="flow"
            placeholder="What's your idea? Describe what you'd like to build…"
            disabled={hasNoProject || disabled}
          />
        </div>
      </div>
    </section>
  )
}
