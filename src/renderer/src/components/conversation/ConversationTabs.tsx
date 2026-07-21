import React, { useEffect, useRef, useState } from 'react'
import { PlusIcon, CloseIcon, EditIcon } from '../icons/Icons'
import type { ProjectConversation } from '../../types/project'
import './conversation-tabs.css'

interface ConversationTabsProps {
  conversations: ProjectConversation[]
  selectedConvId?: string
  activeProjectId?: string
  hasNoProject: boolean
  tabsScrollRef: React.RefObject<HTMLDivElement | null>
  onSelect: (convId: string) => void
  onDelete: (convId: string) => void
  onRename: (convId: string, title: string) => void
  onAdd: () => void
}

export default function ConversationTabs({
  conversations,
  selectedConvId,
  activeProjectId,
  hasNoProject,
  tabsScrollRef,
  onSelect,
  onDelete,
  onRename,
  onAdd
}: ConversationTabsProps): React.JSX.Element {
  const [editingConvId, setEditingConvId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editingConvId) return
    renameInputRef.current?.focus()
    renameInputRef.current?.select()
  }, [editingConvId])

  const startRename = (conversation: ProjectConversation): void => {
    setEditingConvId(conversation.id)
    setEditingName(conversation.title)
  }

  const clearEditing = (): void => {
    setEditingConvId(null)
    setEditingName('')
  }

  const submitRename = (convId: string, currentTitle: string): void => {
    const nextTitle = editingName.trim()
    if (nextTitle && nextTitle !== currentTitle) {
      onRename(convId, nextTitle)
    }
    clearEditing()
  }

  const handleTabKeyDown = (event: React.KeyboardEvent, currentIndex: number): void => {
    let nextIndex: number | null = null
    if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + conversations.length) % conversations.length
    } else if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % conversations.length
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = conversations.length - 1
    }
    if (nextIndex === null) return

    event.preventDefault()
    const nextConversation = conversations[nextIndex]
    onSelect(nextConversation.id)
    requestAnimationFrame(() => {
      tabsScrollRef.current
        ?.querySelector<HTMLElement>(`[data-conv-id="${nextConversation.id}"] [role="tab"]`)
        ?.focus()
    })
  }

  return (
    <div className="conversation-tabs">
      <div
        ref={tabsScrollRef}
        role="tablist"
        aria-label="Project conversations"
        className="conversation-tabs-scroll"
      >
        {conversations.length > 0 ? (
          conversations.map((conv, index) => {
            const isActive = conv.id === selectedConvId
            const isEditing = editingConvId === conv.id
            const canDelete = conversations.length > 1

            return (
              <div
                key={conv.id}
                data-conv-id={conv.id}
                className={`conversation-tab${isActive ? ' is-active' : ''}${isEditing ? ' is-editing' : ''}`}
              >
                {isEditing ? (
                  <input
                    ref={renameInputRef}
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      e.stopPropagation()
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        submitRename(conv.id, conv.title)
                      }
                      if (e.key === 'Escape') {
                        e.preventDefault()
                        clearEditing()
                      }
                    }}
                    onBlur={() => submitRename(conv.id, conv.title)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Conversation name"
                    className="app-input conversation-tab-input"
                  />
                ) : (
                  <>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      tabIndex={isActive ? 0 : -1}
                      className={`conversation-tab-title${canDelete ? ' has-delete' : ''}`}
                      title={conv.title}
                      onClick={() => onSelect(conv.id)}
                      onKeyDown={(event) => handleTabKeyDown(event, index)}
                      onDoubleClick={(e) => {
                        e.preventDefault()
                        startRename(conv)
                      }}
                    >
                      {conv.title}
                    </button>
                    <div className="conversation-tab-actions">
                      <button
                        type="button"
                        className="conversation-tab-action conversation-tab-rename"
                        aria-label="Rename conversation"
                        title="Rename conversation"
                        tabIndex={isActive ? 0 : -1}
                        onClick={(event) => {
                          event.stopPropagation()
                          startRename(conv)
                        }}
                      >
                        <EditIcon size={10} />
                      </button>
                      {canDelete ? (
                        <button
                          type="button"
                          className="conversation-tab-action conversation-tab-close"
                          aria-label="Delete conversation"
                          title="Delete conversation"
                          tabIndex={isActive ? 0 : -1}
                          onClick={(event) => {
                            event.stopPropagation()
                            onDelete(conv.id)
                          }}
                        >
                          <CloseIcon size={10} />
                        </button>
                      ) : null}
                    </div>
                  </>
                )}
              </div>
            )
          })
        ) : (
          <span className="conversation-tabs-empty">No conversation</span>
        )}
      </div>
      <div className="conversation-tabs-add-wrap">
        <button
          type="button"
          className="conversation-tabs-add"
          aria-label="New chat"
          title="New chat"
          onClick={onAdd}
          disabled={hasNoProject || !activeProjectId}
        >
          <PlusIcon size={13} />
        </button>
      </div>
    </div>
  )
}
