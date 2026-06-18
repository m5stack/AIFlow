import React from 'react'

interface ResizeEdgeProps {
  axis: 'row' | 'col'
  /** For col: 'start' = left edge, 'end' = right edge (e.g. chat panel, left sidebar) */
  side?: 'start' | 'end'
  /** Absolute left offset in px when axis is col */
  left?: number
  isDragging: boolean
  onMouseDown: (e: React.MouseEvent) => void
}

export default function ResizeEdge({
  axis,
  side = 'end',
  left,
  isDragging,
  onMouseDown
}: ResizeEdgeProps): React.JSX.Element {
  const isRow = axis === 'row'

  const colStyle: React.CSSProperties | undefined = isRow
    ? undefined
    : {
        position: 'absolute',
        top: 0,
        bottom: 0,
        ...(left != null
          ? { left, transform: 'translateX(-50%)' }
          : side === 'start'
            ? { left: 0 }
            : { right: 0 })
      }

  return (
    <div
      className={`flex-shrink-0 z-30 ${
        isRow
          ? 'h-1 w-full cursor-row-resize'
          : '-mx-1 w-1 cursor-col-resize px-1'
      } ${isDragging ? 'bg-[var(--accent)]' : 'hover:bg-[var(--accent-border)]'}`}
      style={colStyle}
      onMouseDown={onMouseDown}
    />
  )
}
