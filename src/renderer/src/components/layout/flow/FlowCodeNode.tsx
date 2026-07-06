import React from 'react'
import { useFlowStatusStore } from '../../../stores/flowStatusStore'

export default function FlowCodeNode(): React.JSX.Element {
  const code = useFlowStatusStore((s) => s.code)

  return (
    <div className={`flow-code-pill${code ? ' is-flow-glow flow-glow-code' : ''}`}>
      {/* <span className="flow-python-pill-micro">Micro</span> */}
      <span className="flow-code-pill-lang">CODE</span>
    </div>
  )
}
