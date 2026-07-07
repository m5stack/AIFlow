import React, { useRef, useState } from 'react'
import ConversationInput from './ConversationInput'
import ConversationModelSelector, {
  type ConversationModelSelectorHandle
} from './ConversationModelSelector'
import TokenUsageDashboardDialog from './TokenUsageDashboardDialog'
import { ChartIcon, LightbulbIcon } from '../icons/Icons'
import type { AgentSession } from '../../hooks/useAgentSession'

interface ConversationComposerProps {
  session: AgentSession
}

export default function ConversationComposer({
  session
}: ConversationComposerProps): React.JSX.Element {
  const { hasNoProject, chatInputProps } = session
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
          <ConversationInput
            {...restChatInputProps}
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
