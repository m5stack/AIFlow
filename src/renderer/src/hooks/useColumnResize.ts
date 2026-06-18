import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject
} from 'react'

const DEFAULT_RATIOS: [number, number, number] = [1.12, 1, 0.98]
const MIN_WIDTHS: [number, number, number] = [280, 340, 300]
const GAP = 16
const DESKTOP_BREAKPOINT = 1060

type ColRatios = [number, number, number]
type PixelWidths = [number, number, number]

function ratiosToPixelWidths(ratios: ColRatios, available: number): PixelWidths {
  const total = ratios[0] + ratios[1] + ratios[2]
  return [
    (available * ratios[0]) / total,
    (available * ratios[1]) / total,
    (available * ratios[2]) / total
  ]
}

function pixelWidthsToHandlePositions(widths: PixelWidths): [number, number] {
  return [widths[0] + GAP / 2, widths[0] + GAP + widths[1] + GAP / 2]
}

interface UseColumnResizeResult {
  containerRef: RefObject<HTMLElement | null>
  gridTemplateColumns: string | undefined
  cssVariables: CSSProperties
  handlePositions: [number, number]
  draggingIndex: number | null
  isDesktop: boolean
  onResizeStart: (dividerIndex: number, e: React.MouseEvent) => void
}

export function useColumnResize(): UseColumnResizeResult {
  const containerRef = useRef<HTMLElement | null>(null)
  const [colRatios, setColRatios] = useState<ColRatios>(DEFAULT_RATIOS)
  const [handlePositions, setHandlePositions] = useState<[number, number]>([0, 0])
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= DESKTOP_BREAKPOINT
  )

  const dragRef = useRef<{
    dividerIndex: number
    startX: number
    startWidths: PixelWidths
  } | null>(null)

  const updateHandlePositions = useCallback(() => {
    const container = containerRef.current
    if (!container || !isDesktop) return
    const available = container.clientWidth - 2 * GAP
    if (available <= 0) return
    const widths = ratiosToPixelWidths(colRatios, available)
    setHandlePositions(pixelWidthsToHandlePositions(widths))
  }, [colRatios, isDesktop])

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`)
    const onChange = (): void => setIsDesktop(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    updateHandlePositions()
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(() => updateHandlePositions())
    observer.observe(container)
    return () => observer.disconnect()
  }, [updateHandlePositions])

  const onResizeStart = useCallback(
    (dividerIndex: number, e: React.MouseEvent) => {
      e.preventDefault()
      const container = containerRef.current
      if (!container || !isDesktop) return

      const available = container.clientWidth - 2 * GAP
      const startWidths = ratiosToPixelWidths(colRatios, available)
      dragRef.current = { dividerIndex, startX: e.clientX, startWidths }
      setDraggingIndex(dividerIndex)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      const onMouseMove = (moveEvent: MouseEvent): void => {
        const drag = dragRef.current
        if (!drag) return

        const delta = moveEvent.clientX - drag.startX
        const [w1, w2, w3] = drag.startWidths

        if (drag.dividerIndex === 0) {
          const newW1 = Math.max(
            MIN_WIDTHS[0],
            Math.min(w1 + delta, w1 + w2 - MIN_WIDTHS[1])
          )
          const newW2 = w1 + w2 - newW1
          setColRatios([newW1, newW2, w3])
        } else {
          const newW2 = Math.max(
            MIN_WIDTHS[1],
            Math.min(w2 + delta, w2 + w3 - MIN_WIDTHS[2])
          )
          const newW3 = w2 + w3 - newW2
          setColRatios([w1, newW2, newW3])
        }
      }

      const onMouseUp = (): void => {
        dragRef.current = null
        setDraggingIndex(null)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [colRatios, isDesktop]
  )

  const totalRatio = colRatios[0] + colRatios[1] + colRatios[2]

  const gridTemplateColumns = isDesktop
    ? `minmax(${MIN_WIDTHS[0]}px, ${colRatios[0]}fr) minmax(${MIN_WIDTHS[1]}px, ${colRatios[1]}fr) minmax(${MIN_WIDTHS[2]}px, ${colRatios[2]}fr)`
    : undefined

  const cssVariables: CSSProperties = {
    ['--col-1-ratio' as string]: String(colRatios[0]),
    ['--col-2-ratio' as string]: String(colRatios[1]),
    ['--col-3-ratio' as string]: String(colRatios[2]),
    ['--col-total-ratio' as string]: String(totalRatio)
  }

  return {
    containerRef,
    gridTemplateColumns,
    cssVariables,
    handlePositions,
    draggingIndex,
    isDesktop,
    onResizeStart
  }
}
