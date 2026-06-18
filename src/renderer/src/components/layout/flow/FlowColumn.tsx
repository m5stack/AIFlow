import React from 'react'

interface FlowColumnProps {
  children: React.ReactNode
  className?: string
}

export default function FlowColumn({
  children,
  className = ''
}: FlowColumnProps): React.JSX.Element {
  return (
    <div
      className={`flow-column-track relative flex min-h-0 min-w-0 items-center justify-center overflow-visible px-2 py-0 ${className}`}
    >
      {children}
    </div>
  )
}
