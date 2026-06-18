import React, { useEffect, useRef, useState } from 'react'
import { PlusIcon, CloseIcon, EditIcon } from '../icons/Icons'
import type { ProjectConversation } from '../../types/project'

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

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
      <div ref={tabsScrollRef} className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {conversations.length > 0 ? (
          conversations.map((conv) => {
            const isActive = conv.id === selectedConvId
            const isEditing = editingConvId === conv.id
            const deleteButtonVisibility = isActive
              ? 'inline-flex'
              : 'hidden group-hover/tab:inline-flex'

            return (
              <div
                key={conv.id}
                data-conv-id={conv.id}
                className={`group/tab flex h-7 shrink-0 max-w-[180px] cursor-pointer items-center rounded-md text-[12px] transition-colors ${
                  isActive
                    ? 'bg-accent-bg font-medium text-ink'
                    : 'text-muted hover:bg-soft hover:text-ink'
                }`}
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
                    className="app-input h-6 min-w-0 flex-1 rounded-sm px-2 text-[12px]"
                  />
                ) : (
                  <>
                    <button
                      type="button"
                      className="min-w-0 flex-1 cursor-pointer truncate px-2.5 text-left"
                      onClick={() => onSelect(conv.id)}
                      onDoubleClick={(e) => {
                        e.preventDefault()
                        startRename(conv)
                      }}
                    >
                      {conv.title}
                    </button>
                    <button
                      type="button"
                      className="hidden size-5 shrink-0 cursor-pointer items-center justify-center rounded text-muted hover:text-ink group-hover/tab:inline-flex"
                      aria-label="Rename conversation"
                      title="Rename conversation"
                      onClick={(e) => {
                        e.stopPropagation()
                        startRename(conv)
                      }}
                    >
                      <EditIcon size={10} />
                    </button>
                    {conversations.length > 1 && (
                      <button
                        type="button"
                        className={`mr-0.5 size-5 shrink-0 cursor-pointer items-center justify-center rounded text-muted hover:text-ink ${deleteButtonVisibility}`}
                        aria-label="Delete conversation"
                        onClick={() => onDelete(conv.id)}
                      >
                        <CloseIcon size={10} />
                      </button>
                    )}
                  </>
                )}
              </div>
            )
          })
        ) : (
          <span className="text-[12px] text-muted">No conversation</span>
        )}
      </div>
      <button
        type="button"
        className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted transition-colors hover:bg-soft hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="New conversation"
        onClick={onAdd}
        disabled={hasNoProject || !activeProjectId}
      >
        <PlusIcon size={14} />
      </button>
    </div>
  )
}
