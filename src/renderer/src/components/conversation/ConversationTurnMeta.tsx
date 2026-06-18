import React from 'react'
import { RunStatusBadge } from './ConversationMessage'
import { formatTurnDuration } from '../../utils/conversation/formatTurnDuration'
import type { ChatMessage } from '../../types/chat'

interface ConversationTurnMetaProps {
  message: ChatMessage
}

function MetaSeparator(): React.JSX.Element {
  return <span className="text-line">·</span>
}

export default function ConversationTurnMeta({ message }: ConversationTurnMetaProps): React.JSX.Element | null {
  if (message.isStreaming) return null

  const items: React.ReactNode[] = []

  if (message.timestamp) {
    items.push(<span key="time">{message.timestamp}</span>)
  }

  if (message.durationMs != null) {
    items.push(
      <span key="duration">Response time: {formatTurnDuration(message.durationMs)}</span>
    )
  }

  if (message.runStatus) {
    items.push(<RunStatusBadge key="status" status={message.runStatus} />)
  }

  if (items.length === 0) return null

  return (
    <div className="conv-turn-meta">
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <MetaSeparator />}
          {item}
        </React.Fragment>
      ))}
    </div>
  )
}
