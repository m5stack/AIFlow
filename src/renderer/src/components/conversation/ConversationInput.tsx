import React, { useState, useRef, useEffect, useCallback } from 'react'
import { CloseIcon, ImageIcon, SendIcon, StopIcon } from '../icons/Icons'
import { useFlowStatusStore } from '../../stores/flowStatusStore'
import type { ChatModelOption } from '../../types/model'
import type { ChatImageAttachment } from '../../types/chat'
import { CHAT_IMAGE_MAX_COUNT } from '../../../../shared/chatImages'
import { useChatImageAttachments } from '../../hooks/useChatImageAttachments'

interface ConversationInputProps {
  height?: number
  variant?: 'default' | 'empty' | 'flow'
  placeholder?: string
  onSend: (message: string, images: ChatImageAttachment[]) => void
  disabled?: boolean
  isThinking?: boolean
  isInterrupting?: boolean
  models?: ChatModelOption[]
  selectedModel?: string
  onNeedModel?: () => void
  onInterrupt?: () => void
  value: string
  images: ChatImageAttachment[]
  onValueChange: (value: string) => void
  onImagesChange: (images: ChatImageAttachment[]) => void
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
  onInterrupt,
  value,
  images,
  onValueChange,
  onImagesChange
}: ConversationInputProps): React.JSX.Element {
  const [isDraggingImage, setIsDraggingImage] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragDepthRef = useRef(0)
  const setTalk = useFlowStatusStore((s) => s.setTalk)
  const selectedModelConfig = models.find((model) => model.id === selectedModel)
  const hasSelectedModel = Boolean(selectedModel && selectedModelConfig)
  const { imageError, isReadingImages, addImageFiles, removeImage, clearImages } =
    useChatImageAttachments(disabled || isThinking, images, onImagesChange)

  const syncTalkGlow = useCallback(
    (nextValue: string) => {
      const hasContent = nextValue.trim() !== '' || images.length > 0
      setTalk(hasContent)
      if (hasContent) {
        const status = useFlowStatusStore.getState().device
        if (status === 'success' || status === 'failed') {
          useFlowStatusStore.getState().setDevice('idle')
        }
      }
    },
    [images.length, setTalk]
  )

  const handleFocus = (): void => {
    if (value.trim() !== '' || images.length > 0) {
      setTalk(true)
    }
  }

  const handleBlur = (): void => {
    setTalk(false)
  }

  useEffect(() => {
    return () => setTalk(false)
  }, [setTalk])

  const attachImageFiles = (files: File[]): void => {
    void addImageFiles(files).then((added) => {
      if (added) setTalk(true)
    })
  }

  const handleRemoveImage = (imageId: string): void => {
    if (images.length === 1 && value.trim() === '') setTalk(false)
    removeImage(imageId)
  }

  const handleSend = (): void => {
    const trimmed = value.trim()
    if ((!trimmed && images.length === 0) || disabled || isThinking || isReadingImages) return
    if (!hasSelectedModel) {
      onNeedModel?.()
      return
    }
    onSend(trimmed, images)
    onValueChange('')
    clearImages()
    setTalk(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>): void => {
    const pastedImages = Array.from(event.clipboardData.files).filter((file) =>
      file.type.startsWith('image/')
    )
    if (pastedImages.length === 0) return
    event.preventDefault()
    attachImageFiles(pastedImages)
  }

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>): void => {
    if (!event.dataTransfer.types.includes('Files')) return
    event.preventDefault()
    dragDepthRef.current += 1
    setIsDraggingImage(true)
  }

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>): void => {
    if (!event.dataTransfer.types.includes('Files')) return
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
    if (dragDepthRef.current === 0) setIsDraggingImage(false)
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault()
    dragDepthRef.current = 0
    setIsDraggingImage(false)
    const droppedImages = Array.from(event.dataTransfer.files).filter((file) =>
      file.type.startsWith('image/')
    )
    attachImageFiles(droppedImages)
  }

  const isEmptyVariant = variant === 'empty'
  const isFlowVariant = variant === 'flow'

  const sendButton = isThinking ? (
    <button
      type="button"
      className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#e5484d] text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      onClick={onInterrupt}
      disabled={isInterrupting || !onInterrupt}
      title="Stop generation"
    >
      <StopIcon size={11} />
    </button>
  ) : isFlowVariant ? (
    <button
      type="button"
      className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-gray-200 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      onClick={handleSend}
      disabled={(!value.trim() && images.length === 0) || disabled || isReadingImages}
      title={hasSelectedModel ? 'Send message' : 'Add a model to continue'}
      aria-label={hasSelectedModel ? 'Send message' : 'Add a model to continue'}
    >
      <SendIcon size={16} />
    </button>
  ) : (
    <button
      type="button"
      className="flex size-7 shrink-0 items-center justify-center rounded-full text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      style={{ backgroundColor: value.trim() || images.length > 0 ? '#4f8ef7' : 'var(--default)' }}
      onClick={handleSend}
      disabled={(!value.trim() && images.length === 0) || disabled || isReadingImages}
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
        className={`relative flex flex-col overflow-hidden ${isDraggingImage ? 'ring-2 ring-inset ring-accent' : ''} ${
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
        onDragEnter={handleDragEnter}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {images.length > 0 && (
          <div
            className="flex shrink-0 gap-2 overflow-x-auto px-3 pt-2.5"
            aria-label="Attached images"
          >
            {images.map((image) => (
              <div key={image.id} className="group relative size-12 shrink-0">
                <img
                  src={`data:${image.mediaType};base64,${image.data}`}
                  alt={image.name}
                  className="size-full rounded border border-line object-cover"
                />
                <button
                  type="button"
                  className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full border border-line bg-surface text-muted shadow transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
                  onClick={() => handleRemoveImage(image.id)}
                  aria-label={`Remove ${image.name}`}
                  title={`Remove ${image.name}`}
                >
                  <CloseIcon size={9} />
                </button>
              </div>
            ))}
          </div>
        )}
        <textarea
          ref={textareaRef}
          className="min-h-0 w-full flex-1 resize-none bg-transparent px-3 py-2.5 text-[13px] leading-relaxed text-ink outline-none placeholder:text-muted"
          value={value}
          onChange={(e) => {
            const nextValue = e.target.value
            onValueChange(nextValue)
            syncTalkGlow(nextValue)
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          disabled={disabled}
          placeholder={placeholder}
          rows={isEmptyVariant ? 3 : 1}
        />

        <div
          className={`flex items-center justify-between gap-2 px-2.5 py-1.5 ${
            isFlowVariant ? 'h-9 text-[13px] text-muted' : ''
          }`}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              className="sr-only"
              tabIndex={-1}
              onChange={(event) => {
                attachImageFiles(Array.from(event.target.files ?? []))
                event.target.value = ''
              }}
            />
            <button
              type="button"
              className="flex size-7 shrink-0 items-center justify-center rounded text-muted transition-colors hover:bg-soft hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => fileInputRef.current?.click()}
              disabled={
                disabled || isThinking || isReadingImages || images.length >= CHAT_IMAGE_MAX_COUNT
              }
              aria-label="Attach images"
              title="Attach images"
            >
              <ImageIcon size={14} />
            </button>
            {imageError && (
              <span className="truncate text-[11px] text-[#e5484d]" role="alert" title={imageError}>
                {imageError}
              </span>
            )}
          </div>
          {sendButton}
        </div>
      </div>
    </div>
  )
}
