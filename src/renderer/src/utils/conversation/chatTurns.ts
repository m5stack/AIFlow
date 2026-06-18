import type { ChatMessage } from '../../types/chat'

export type ChatTurn = {
  id: string
  user?: ChatMessage
  assistantParts: ChatMessage[]
}

export function groupMessagesIntoTurns(messages: ChatMessage[]): ChatTurn[] {
  const turns: ChatTurn[] = []
  let current: ChatTurn | null = null

  for (const message of messages) {
    if (message.role === 'user') {
      current = { id: message.id, user: message, assistantParts: [] }
      turns.push(current)
      continue
    }

    if (current) {
      current.assistantParts.push(message)
      continue
    }

    current = { id: message.id, assistantParts: [message] }
    turns.push(current)
  }

  return turns
}

export function mergeAssistantParts(parts: ChatMessage[]): ChatMessage {
  const first = parts[0]
  const last = parts[parts.length - 1]

  return {
    id: first.id,
    role: 'assistant',
    content: parts
      .map((part) => part.content)
      .filter(Boolean)
      .join('\n\n'),
    reasoning: parts
      .map((part) => part.reasoning)
      .filter(Boolean)
      .join('\n\n') || undefined,
    timestamp: last.timestamp,
    isStreaming: parts.some((part) => part.isStreaming),
    codeBlocks: parts.flatMap((part) => part.codeBlocks ?? []),
    durationMs: [...parts].reverse().find((part) => part.durationMs != null)?.durationMs,
    runStatus: [...parts].reverse().find((part) => part.runStatus != null)?.runStatus
  }
}
