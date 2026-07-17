import React from 'react'

export type FlowArrowVariant = 'pink' | 'blue' | 'green' | 'amber' | 'violet'
export type FlowArrowDirection = 'right' | 'up' | 'down'

interface FlowArrowProps {
  variant: FlowArrowVariant
  direction?: FlowArrowDirection
  bridge?: boolean
  className?: string
}

const STROKE_WIDTH = 2.4

function ArrowSvg({ direction }: { direction: FlowArrowDirection }): React.JSX.Element {
  if (direction === 'up') {
    return (
      <svg viewBox="0 0 24 30" fill="none" aria-hidden="true">
        <line
          x1="12"
          y1="26"
          x2="12"
          y2="8"
          stroke="currentColor"
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
        />
        <polyline
          points="6,14 12,6 18,14"
          stroke="currentColor"
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    )
  }

  if (direction === 'down') {
    return (
      <svg viewBox="0 0 24 30" fill="none" aria-hidden="true">
        <line
          x1="12"
          y1="4"
          x2="12"
          y2="22"
          stroke="currentColor"
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
        />
        <polyline
          points="6,16 12,24 18,16"
          stroke="currentColor"
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    )
  }

  return (
    <span className="flow-arrow-horizontal" aria-hidden="true">
      <span className="flow-arrow-horizontal-line" />
      <svg viewBox="0 0 14 30" fill="none">
        <polyline
          points="1,8 13,15 1,22"
          stroke="currentColor"
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </span>
  )
}

export default function FlowArrow({
  variant,
  direction = 'right',
  bridge = false,
  className = ''
}: FlowArrowProps): React.JSX.Element {
  return (
    <div
      aria-hidden="true"
      className={`flow-arrow flow-arrow-${variant} flow-arrow-${direction} ${bridge ? 'flow-arrow-bridge' : ''} ${className}`}
    >
      <ArrowSvg direction={direction} />
    </div>
  )
}
