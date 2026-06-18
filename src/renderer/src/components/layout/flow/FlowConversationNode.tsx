import React from 'react'

export default function FlowConversationNode(): React.JSX.Element {
  return (
    <div className="flow-talk-anchor">
      <div className="flow-talk-bubble">
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
