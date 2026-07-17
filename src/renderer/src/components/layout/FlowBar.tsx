import React, { useLayoutEffect, useRef } from 'react'
import FlowColumn from './flow/FlowColumn'
import FlowArrow from './flow/FlowArrow'
import FlowConversationNode from './flow/FlowConversationNode'
import FlowAiNode from './flow/FlowAiNode'
import FlowCodeNode from './flow/FlowCodeNode'
import FlowDevice from './flow/FlowDevice'
import './flow/flow-bar.css'

export default function FlowBar(): React.JSX.Element {
  const flowBarRef = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const flowBar = flowBarRef.current
    if (!flowBar) return

    const chatNode = flowBar.querySelector<HTMLElement>('.flow-talk-anchor')
    const aiNode = flowBar.querySelector<SVGSVGElement>('.flow-ai-cloud-svg')
    const codeNode = flowBar.querySelector<HTMLElement>('.flow-code-pill')
    const deviceNode = flowBar.querySelector<HTMLElement>('.flow-device-wrap')
    if (!chatNode || !aiNode || !codeNode || !deviceNode) return

    const updateHorizontalArrows = (): void => {
      const flowBarRect = flowBar.getBoundingClientRect()
      const chatRect = chatNode.getBoundingClientRect()
      const aiRect = aiNode.getBoundingClientRect()
      const codeRect = codeNode.getBoundingClientRect()
      const deviceRect = deviceNode.getBoundingClientRect()
      const endpointGap = 4

      const pinkLeft = chatRect.right - flowBarRect.left + endpointGap
      const pinkRight = aiRect.left - flowBarRect.left - endpointGap
      const blueLeft = aiRect.right - flowBarRect.left + endpointGap
      const blueRight = codeRect.left - flowBarRect.left - endpointGap
      const greenLeft = codeRect.right - flowBarRect.left + endpointGap
      const greenRight = deviceRect.left - flowBarRect.left - endpointGap

      flowBar.style.setProperty('--flow-arrow-pink-left', `${pinkLeft}px`)
      flowBar.style.setProperty('--flow-arrow-pink-width', `${Math.max(0, pinkRight - pinkLeft)}px`)
      flowBar.style.setProperty('--flow-arrow-blue-left', `${blueLeft}px`)
      flowBar.style.setProperty('--flow-arrow-blue-width', `${Math.max(0, blueRight - blueLeft)}px`)
      flowBar.style.setProperty('--flow-arrow-green-left', `${greenLeft}px`)
      flowBar.style.setProperty(
        '--flow-arrow-green-width',
        `${Math.max(0, greenRight - greenLeft)}px`
      )
    }

    updateHorizontalArrows()

    const resizeObserver = new ResizeObserver(updateHorizontalArrows)
    resizeObserver.observe(flowBar)
    resizeObserver.observe(chatNode)
    resizeObserver.observe(aiNode)
    resizeObserver.observe(codeNode)
    resizeObserver.observe(deviceNode)

    const workspace = flowBar.parentElement
    const columnObserver = new MutationObserver(updateHorizontalArrows)
    if (workspace) {
      columnObserver.observe(workspace, { attributes: true, attributeFilter: ['style'] })
    }

    return () => {
      resizeObserver.disconnect()
      columnObserver.disconnect()
    }
  }, [])

  return (
    <nav
      ref={flowBarRef}
      aria-label="AIFlow workflow"
      className="flow-bar relative z-10 col-span-full grid min-h-0 grid-cols-subgrid items-center gap-0 overflow-visible"
    >
      <FlowColumn className="flow-col-talk min-w-0 col-start-1">
        <div className="flow-column-track-row flow-conversation-row w-full">
          <FlowConversationNode />
          <span className="flow-conversation-arrow-slot" aria-hidden />
          <FlowAiNode />
        </div>
      </FlowColumn>

      <FlowArrow variant="pink" bridge className="flow-arrow-chat-ai" />
      <FlowArrow variant="blue" bridge className="flow-arrow-bridge-1" />

      <FlowColumn className="min-w-0 col-start-2">
        <FlowArrow variant="violet" direction="up" className="flow-arrow-vert flow-arrow-up" />
        <div className="flow-column-track-row flex w-full items-center justify-center">
          <FlowCodeNode />
        </div>
        <FlowArrow variant="violet" direction="down" className="flow-arrow-vert flow-arrow-down" />
      </FlowColumn>

      {/* <div className="flow-cloud-download-fork">
        <FlowCloudDownloadNode />
      </div> */}

      <FlowArrow variant="green" bridge className="flow-arrow-fork-device" />
      {/* <FlowArrow variant="amber" bridge className="flow-arrow-fork-data" /> */}

      <FlowColumn className="flow-col-device min-w-0 col-start-3">
        <FlowArrow
          variant="green"
          direction="up"
          className="flow-arrow-vert flow-arrow-up flow-arrow-vert-device"
        />
        <div className="flow-column-track-row flow-device-cluster flex w-full items-center">
          <FlowDevice />
        </div>
        <FlowArrow
          variant="green"
          direction="down"
          className="flow-arrow-vert flow-arrow-down flow-arrow-vert-device"
        />
      </FlowColumn>
    </nav>
  )
}
