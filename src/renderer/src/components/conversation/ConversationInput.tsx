import React, { useState, useRef } from 'react'
import { SendIcon, StopIcon } from '../icons/Icons'
import type { ChatModelOption } from '../../types/model'

interface ConversationInputProps {
  height?: number
  variant?: 'default' | 'empty' | 'flow'
  placeholder?: string
  onSend: (message: string) => void
  disabled?: boolean
  isThinking?: boolean
  isInterrupting?: boolean
  models?: ChatModelOption[]
  selectedModel?: string
  onNeedModel?: () => void
  onInterrupt?: () => void
}

export default function ConversationInput({
  height = 180,
  variant = 'default',
  placeholder = 'Ask about your project…',
  onSend,
  disabled = false,
  isThinking = false,
  isInterrupting = false,
  models = [],
  selectedModel = '',
  onNeedModel,
  onInterrupt
}: ConversationInputProps): React.JSX.Element {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const selectedModelConfig = models.find((model) => model.id === selectedModel)
  const hasSelectedModel = Boolean(selectedModel && selectedModelConfig)

  const handleSend = (): void => {
    const trimmed = value.trim()
    if (!trimmed || disabled || isThinking) return
    if (!hasSelectedModel) {
      onNeedModel?.()
      return
    }
    onSend(trimmed)
    setValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isEmptyVariant = variant === 'empty'
  const isFlowVariant = variant === 'flow'

  const sendButton = isThinking ? (
    <button
      type="button"
      className="flex size-7 items-center justify-center rounded-full bg-[#e5484d] text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      onClick={onInterrupt}
      disabled={isInterrupting || !onInterrupt}
      title="Stop generation"
    >
      <StopIcon size={11} />
    </button>
  ) : isFlowVariant ? (
    <button
      type="button"
      className="flex size-7 items-center justify-center rounded-full bg-accent text-[#07111e] transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      onClick={handleSend}
      disabled={!value.trim() || disabled}
      title={hasSelectedModel ? 'Send message' : 'Add a model to continue'}
      aria-label={hasSelectedModel ? 'Send message' : 'Add a model to continue'}
    >
      <SendIcon size={16} />
    </button>
  ) : (
    <button
      type="button"
      className="flex size-7 items-center justify-center rounded-full text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      style={{ backgroundColor: value.trim() ? '#4f8ef7' : 'var(--default)' }}
      onClick={handleSend}
      disabled={!value.trim() || disabled}
      title={hasSelectedModel ? 'Send message' : 'Add a model to continue'}
    >
      <SendIcon size={16} />
    </button>
  )

  return (
    <div
      className={
        isFlowVariant
          ? 'flex h-full min-h-0 flex-col'
          : `flex-shrink-0 p-3 ${isEmptyVariant ? 'mx-auto w-full max-w-[520px]' : ''}`
      }
      style={
        isFlowVariant
          ? undefined
          : {
              borderTop: isEmptyVariant ? undefined : '1px solid var(--border)',
              backgroundColor: 'var(--sidebar-bg)',
              height
            }
      }
    >
      <div
        className={`flex flex-col overflow-hidden ${
          isFlowVariant
            ? 'h-full min-h-0'
            : 'h-full rounded-lg focus-within:ring-1 focus-within:ring-accent'
        }`}
        style={
          isFlowVariant
            ? undefined
            : {
                backgroundColor: 'var(--input-bg)',
                border: '1px solid var(--input-border)',
                transition: 'box-shadow 0.15s'
              }
        }
      >
        <textarea
          ref={textareaRef}
          className="min-h-0 w-full flex-1 resize-none bg-transparent px-3 py-2.5 text-[13px] leading-relaxed text-ink outline-none placeholder:text-muted"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          rows={isEmptyVariant ? 3 : 1}
        />

        <div
          className={`flex items-center justify-end px-2.5 py-1.5 ${
            isFlowVariant ? 'h-9 text-[13px] text-muted' : ''
          }`}
        >
          {sendButton}
        </div>
      </div>
    </div>
  )
}
