import React from 'react'

export default function FlowAiNode(): React.JSX.Element {
  return (
    <div className="flow-ai-anchor">
      <div className="flow-ai-dots" aria-hidden="true">
        <span className="flow-ai-dot flow-ai-dot-sm" />
        <span className="flow-ai-dot flow-ai-dot-lg" />
      </div>
      <div className="flow-ai-cloud">
        <svg className="flow-ai-cloud-svg" viewBox="0 0 102 58" aria-hidden="true">
          <g fill="currentColor">
            <rect x="22" y="20" width="58" height="22" />
            <circle cx="14" cy="31" r="10" />
            <circle cx="26" cy="23" r="11" />
            <circle cx="40" cy="17" r="12" />
            <circle cx="56" cy="15" r="13" />
            <circle cx="72" cy="17" r="12" />
            <circle cx="86" cy="25" r="11" />
            <circle cx="92" cy="35" r="10" />
            <circle cx="82" cy="42" r="11" />
            <circle cx="66" cy="46" r="12" />
            <circle cx="48" cy="44" r="11" />
            <circle cx="32" cy="41" r="10" />
            <circle cx="16" cy="37" r="9" />
          </g>
        </svg>
        <span className="flow-ai-label">AI</span>
      </div>
    </div>
  )
}
