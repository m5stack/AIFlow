import React, { useEffect, useState } from 'react'
import { formatTurnDuration } from '../../utils/conversation/formatTurnDuration'

const THINKING_PHRASES = [
  'Analyzing project structure…',
  'Reading pin maps…',
  'Designing a MicroPython approach…',
  'Scanning project files…',
  'Checking device configuration…',
  'Organizing code approach…',
  'Exploring the codebase…',
  'Planning next changes…',
  'Reviewing your request…',
  'Finding related modules…',
  'Drafting a response…',
  'Connecting the dots…',
  'Analyzing hardware pin mapping…',
  'Preparing suggestions…'
]

function pickRandomPhrase(exclude?: string): string {
  const candidates =
    exclude && THINKING_PHRASES.length > 1
      ? THINKING_PHRASES.filter((phrase) => phrase !== exclude)
      : THINKING_PHRASES
  return candidates[Math.floor(Math.random() * candidates.length)] ?? THINKING_PHRASES[0]
}

function useElapsedMs(startedAt: number): number {
  const [elapsedMs, setElapsedMs] = useState(() => Date.now() - startedAt)

  useEffect(() => {
    setElapsedMs(Date.now() - startedAt)
    const interval = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt)
    }, 1000)

    return () => window.clearInterval(interval)
  }, [startedAt])

  return elapsedMs
}

interface ConversationThinkingIndicatorProps {
  startedAt: number
  activityLabel?: string
}

export default function ConversationThinkingIndicator({
  startedAt,
  activityLabel
}: ConversationThinkingIndicatorProps): React.JSX.Element {
  const [phrase, setPhrase] = useState(() => pickRandomPhrase())
  const [visible, setVisible] = useState(true)
  const elapsedMs = useElapsedMs(startedAt)
  const displayText = activityLabel ?? phrase

  useEffect(() => {
    if (activityLabel) return
    const interval = window.setInterval(() => {
      setVisible(false)
      window.setTimeout(() => {
        setPhrase((current) => pickRandomPhrase(current))
        setVisible(true)
      }, 200)
    }, 2500)

    return () => window.clearInterval(interval)
  }, [activityLabel])

  return (
    <div className="conv-message-thinking">
      <span className="block text-[13px] leading-relaxed">
        <span
          className={`conv-thinking-text ${
            activityLabel || visible ? '' : 'conv-thinking-text-fade'
          }`}
        >
          {displayText}
        </span>
      </span>
      <span className="conv-thinking-elapsed">{formatTurnDuration(elapsedMs)}</span>
    </div>
  )
}
