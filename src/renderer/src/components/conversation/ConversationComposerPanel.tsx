import React, { useRef } from 'react'
import ConversationInput from './ConversationInput'
import ConversationModelSelector, {
  type ConversationModelSelectorHandle
} from './ConversationModelSelector'
import PanelShell from '../layout/PanelShell'
import { LightbulbIcon } from '../icons/Icons'
import type { AgentSession } from '../../hooks/useAgentSession'

interface ConversationComposerPanelProps {
  session: AgentSession
}

export default function ConversationComposerPanel({
  session
}: ConversationComposerPanelProps): React.JSX.Element {
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

  return (
    <PanelShell
      title="Your Idea"
      icon={<LightbulbIcon size={16} />}
      className="relative z-[1]"
      bodyClassName="flex flex-col gap-2 overflow-hidden p-3.5"
      actions={
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
      }
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-line bg-transparent">
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
    </PanelShell>
  )
}
