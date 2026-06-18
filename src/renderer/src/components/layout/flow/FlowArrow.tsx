import React from 'react'

export type FlowArrowVariant = 'pink' | 'blue' | 'green' | 'amber'

interface FlowArrowProps {
  variant: FlowArrowVariant
  bridge?: boolean
  className?: string
}

export default function FlowArrow({
  variant,
  bridge = false,
  className = ''
}: FlowArrowProps): React.JSX.Element {
  return (
    <div
      aria-hidden="true"
      className={`flow-arrow flow-arrow-${variant} ${bridge ? 'flow-arrow-bridge' : ''} ${className}`}
    />
  )
}
