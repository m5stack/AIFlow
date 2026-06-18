import React from 'react'
import FlowColumn from './flow/FlowColumn'
import FlowArrow from './flow/FlowArrow'
import FlowConversationNode from './flow/FlowConversationNode'
import FlowAiNode from './flow/FlowAiNode'
import FlowCodeNode from './flow/FlowCodeNode'
import FlowCloudDownloadNode from './flow/FlowCloudDownloadNode'
import FlowDevice from './flow/FlowDevice'
import './flow/flow-bar.css'

export default function FlowBar(): React.JSX.Element {
  return (
    <nav
      aria-label="AI-FLOW workflow"
      className="flow-bar relative z-10 col-span-full grid min-h-0 grid-cols-subgrid items-center gap-0 overflow-visible"
    >
      <FlowColumn className="flow-col-talk min-w-0 col-start-1">
        <div className="flow-column-track-row flow-conversation-row w-full">
          <FlowConversationNode />
          <FlowArrow variant="pink" />
          <FlowAiNode />
        </div>
      </FlowColumn>

      <FlowArrow variant="blue" bridge className="flow-arrow-bridge-1" />

      <FlowColumn className="min-w-0 col-start-2">
        <div className="flow-column-track-row flex w-full items-center justify-center">
          <FlowCodeNode />
        </div>
      </FlowColumn>

      <div className="flow-cloud-download-fork">
        <FlowCloudDownloadNode />
      </div>

      <FlowArrow variant="green" bridge className="flow-arrow-fork-device" />
      <FlowArrow variant="amber" bridge className="flow-arrow-fork-data" />

      <FlowColumn className="min-w-0 col-start-3">
        <div className="flow-column-track-row flow-device-cluster flex w-full items-center justify-center">
          <FlowDevice />
        </div>
      </FlowColumn>
    </nav>
  )
}
