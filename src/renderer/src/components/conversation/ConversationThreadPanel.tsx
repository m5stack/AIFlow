import React from 'react'
import { ChatBubbleIcon } from '../icons/Icons'
import ConversationMessage from './ConversationMessage'
import ConversationEmptyState from './ConversationEmptyState'
import ConversationThinkingIndicator from './ConversationThinkingIndicator'
import PanelShell from '../layout/PanelShell'
import ConversationTabs from './ConversationTabs'
import ConversationTurnMeta from './ConversationTurnMeta'
import { useChatAutoScroll } from '../../hooks/useChatAutoScroll'
import type { AgentSession } from '../../hooks/useAgentSession'

interface ConversationThreadPanelProps {
  session: AgentSession
}

export default function ConversationThreadPanel({
  session
}: ConversationThreadPanelProps): React.JSX.Element {
  const {
    activeProjectId,
    conversations,
    selectedConvId,
    chatTurns,
    hasNoProject,
    isEmptyConversation,
    isThinking,
    thinkingStartedAt,
    activityLabel,
    autoScrollActive,
    tabsScrollRef,
    setSelectedConv,
    deleteConversation,
    renameConversation,
    handleAddConversation,
    setShowNewProjectDialog,
    mergeAssistantParts
  } = session

  const { scrollContainerRef, messagesEndRef } = useChatAutoScroll({
    active: autoScrollActive,
    deps: [session.messages, activityLabel, selectedConvId]
  })

  return (
    <PanelShell
      title="Conversation"
      icon={<ChatBubbleIcon size={16} />}
      bodyClassName="flex flex-col gap-3 overflow-hidden"
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-line pb-2">
        <ConversationTabs
          conversations={conversations}
          selectedConvId={selectedConvId}
          activeProjectId={activeProjectId}
          hasNoProject={hasNoProject}
          tabsScrollRef={tabsScrollRef}
          onSelect={(convId) => {
            if (activeProjectId) setSelectedConv(activeProjectId, convId)
          }}
          onDelete={(convId) => {
            if (activeProjectId) void deleteConversation(activeProjectId, convId)
          }}
          onRename={(convId, title) => {
            if (activeProjectId) void renameConversation(activeProjectId, convId, title)
          }}
          onAdd={handleAddConversation}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {hasNoProject ? (
          <ConversationEmptyState onCreateProject={() => setShowNewProjectDialog(true)} />
        ) : isEmptyConversation ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 py-6 text-center">
            <ChatBubbleIcon size={28} className="opacity-80" />
            <div>
              <h2 className="text-[18px] font-semibold text-ink">What can I help you build?</h2>
              <p className="mt-1 text-[12px] text-muted">
                Ask about your MicroPython project, device pins, or code changes.
              </p>
            </div>
          </div>
        ) : (
          <div ref={scrollContainerRef} className="h-full overflow-y-auto">
            <div className="flex flex-col gap-4">
              {chatTurns.map((turn) => (
                <React.Fragment key={turn.id}>
                  {turn.user && (
                    <div className="conv-message-user select-text">
                      <ConversationMessage message={turn.user} />
                    </div>
                  )}
                  {turn.assistantParts.length > 0 &&
                    (() => {
                      const assistantMessage = mergeAssistantParts(turn.assistantParts)
                      return (
                        <div className="conv-turn-group">
                          <div className="conv-message-assistant select-text">
                            <ConversationMessage message={assistantMessage} />
                          </div>
                          <ConversationTurnMeta message={assistantMessage} />
                        </div>
                      )
                    })()}
                </React.Fragment>
              ))}
              {isThinking && thinkingStartedAt != null && (
                <ConversationThinkingIndicator
                  startedAt={thinkingStartedAt}
                  activityLabel={activityLabel}
                />
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </div>
    </PanelShell>
  )
}
