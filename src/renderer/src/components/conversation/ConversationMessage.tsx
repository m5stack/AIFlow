import React from 'react'
import { CheckIcon, ChevronDownIcon, CloseIcon } from '../icons/Icons'
import ConversationMarkdown from './ConversationMarkdown'
import type { ChatMessage as ChatMessageType, ChatCodeBlock } from '../../types/chat'
import type { ChatMessageRunStatus } from '../../types/project'

export type { ChatMessage } from '../../types/chat'

interface ConversationMessageProps {
  message: ChatMessageType
}

function MessageBody({ message }: { message: ChatMessageType }): React.JSX.Element {
  const isUser = message.role === 'user'

  return (
    <>
      {!isUser && message.reasoning && (
        <ReasoningBlock reasoning={message.reasoning} isStreaming={message.isStreaming} />
      )}
      {isUser ? (
        <span className="whitespace-pre-wrap">{message.content}</span>
      ) : message.content ? (
        message.isStreaming ? (
          <span className="conv-streaming-text whitespace-pre-wrap">
            {message.content}
            <span className="conv-streaming-cursor" aria-hidden="true" />
          </span>
        ) : (
          <ConversationMarkdown content={message.content} />
        )
      ) : message.isStreaming ? (
        <span className="conv-streaming-text conv-streaming-placeholder">Generating reply…</span>
      ) : (
        <span className="text-muted italic">(No text reply)</span>
      )}
      {message.codeBlocks?.map((block, i) => (
        <div key={i} className="mt-2 w-full">
          <CodeBlockView block={block} />
        </div>
      ))}
    </>
  )
}

export function RunStatusBadge({ status }: { status: ChatMessageRunStatus }): React.JSX.Element {
  if (status === 'running') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-[var(--text)]">
        <span className="inline-block w-2.5 h-2.5 rounded-full border border-current border-t-transparent animate-spin" />
        Running
      </span>
    )
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-[#f85149]">
        <CloseIcon size={11} />
        Run failed
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-[#3fb950]">
      <CheckIcon size={11} />
      Run successful
    </span>
  )
}

function CodeBlockView({ block }: { block: ChatCodeBlock }): React.JSX.Element {
  return (
    <div
      className="mt-2 rounded-md overflow-hidden select-text"
      style={{ border: '1px solid var(--border)' }}
    >
      <div
        className="flex items-center justify-between px-3 py-1.5"
        style={{ backgroundColor: 'color-mix(in srgb, var(--social-bg) 70%, var(--bg))' }}
      >
        <span className="text-[10px] text-[var(--text)] font-mono">{block.language}</span>
        <button className="text-[10px] text-[var(--text)] hover:text-[var(--text-h)] transition-colors">
          Copy
        </button>
      </div>
      <pre
        className="px-3 py-2.5 overflow-x-auto text-[12px] leading-relaxed font-mono text-[var(--text-h)] select-text"
        style={{ backgroundColor: 'var(--social-bg)' }}
      >
        {block.code}
      </pre>
    </div>
  )
}

function ReasoningBlock({
  reasoning,
  isStreaming
}: {
  reasoning: string
  isStreaming?: boolean
}): React.JSX.Element {
  const [collapsed, setCollapsed] = React.useState(false)
  const bodyRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (isStreaming) setCollapsed(false)
  }, [isStreaming])

  React.useEffect(() => {
    if (!isStreaming || collapsed) return
    const body = bodyRef.current
    if (!body) return
    body.scrollTop = body.scrollHeight
  }, [reasoning, isStreaming, collapsed])

  return (
    <div className="conv-reasoning-block">
      <button
        type="button"
        className="conv-reasoning-toggle"
        onClick={() => setCollapsed((value) => !value)}
        aria-expanded={!collapsed}
      >
        <span className="conv-reasoning-label">
          {isStreaming ? 'Reasoning…' : 'Reasoning'}
        </span>
        <ChevronDownIcon
          size={12}
          className={`conv-reasoning-chevron ${collapsed ? '' : 'conv-reasoning-chevron-open'}`}
        />
      </button>
      {!collapsed && (
        <div
          ref={bodyRef}
          className={`conv-reasoning-body ${isStreaming ? 'conv-reasoning-body-streaming' : ''}`}
        >
          <span className="whitespace-pre-wrap">{reasoning}</span>
        </div>
      )}
    </div>
  )
}

export default function ConversationMessage({ message }: ConversationMessageProps): React.JSX.Element {
  return <MessageBody message={message} />
}
