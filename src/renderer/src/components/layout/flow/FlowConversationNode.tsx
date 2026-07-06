import React from 'react'
import { useFlowStatusStore } from '../../../stores/flowStatusStore'

export default function FlowConversationNode(): React.JSX.Element {
  const talk = useFlowStatusStore((s) => s.talk)

  return (
    <div className="flow-talk-anchor">
      <div className={`flow-talk-bubble${talk ? ' is-flow-glow flow-glow-talk' : ''}`}>
        <svg className="flow-talk-bubble-svg" viewBox="0 0 112 78" aria-hidden="true">
          <g fill="currentColor">
            <ellipse cx="58" cy="32" rx="48" ry="26" />
            <polygon points="28,40 24,80 54,50" />
          </g>
        </svg>
        <span className="flow-talk-label">Talk</span>
      </div>
    </div>
  )
}
