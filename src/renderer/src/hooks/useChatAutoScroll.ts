import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
  type UIEventHandler
} from 'react'

const BOTTOM_THRESHOLD_PX = 48
const SMOOTH_SCROLL_FALLBACK_MS = 600

type UseChatAutoScrollOptions = {
  /** Starting a new turn resumes following new content. */
  active: boolean
  /** True while the scroll container is rendered. */
  enabled?: boolean
  /** Switching this key resets the new conversation to its latest message. */
  resetKey?: unknown
  /** Extra values that should trigger a scroll attempt while following. */
  deps?: unknown[]
}

type UseChatAutoScrollResult = {
  scrollContainerRef: RefObject<HTMLDivElement | null>
  handleScroll: UIEventHandler<HTMLDivElement>
  showJumpToLatest: boolean
  jumpToLatest: () => void
}

type ScrollState = {
  isAtBottom: boolean
  hasOverflow: boolean
}

const readScrollState = (container: HTMLDivElement): ScrollState => {
  const distanceFromBottom = Math.max(
    0,
    container.scrollHeight - container.clientHeight - container.scrollTop
  )
  return {
    isAtBottom: distanceFromBottom <= BOTTOM_THRESHOLD_PX,
    hasOverflow: container.scrollHeight > container.clientHeight + 1
  }
}

export function useChatAutoScroll({
  active,
  enabled = true,
  resetKey,
  deps = []
}: UseChatAutoScrollOptions): UseChatAutoScrollResult {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isFollowingRef = useRef(true)
  const wasActiveRef = useRef(false)
  const scheduledFrameRef = useRef<number | null>(null)
  const smoothScrollRef = useRef(false)
  const smoothScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showJumpToLatest, setShowJumpToLatest] = useState(false)

  const clearSmoothScroll = useCallback((): void => {
    smoothScrollRef.current = false
    if (smoothScrollTimerRef.current) {
      clearTimeout(smoothScrollTimerRef.current)
      smoothScrollTimerRef.current = null
    }
  }, [])

  const syncScrollState = useCallback(
    (container: HTMLDivElement): void => {
      const { isAtBottom, hasOverflow } = readScrollState(container)
      if (smoothScrollRef.current) {
        if (isAtBottom) clearSmoothScroll()
        isFollowingRef.current = true
        setShowJumpToLatest(false)
        return
      }

      isFollowingRef.current = isAtBottom
      setShowJumpToLatest(hasOverflow && !isAtBottom)
    },
    [clearSmoothScroll]
  )

  const scheduleScrollToBottom = useCallback((): void => {
    isFollowingRef.current = true

    if (scheduledFrameRef.current !== null) {
      cancelAnimationFrame(scheduledFrameRef.current)
    }
    scheduledFrameRef.current = requestAnimationFrame(() => {
      scheduledFrameRef.current = requestAnimationFrame(() => {
        scheduledFrameRef.current = null
        const container = scrollContainerRef.current
        if (!container || !isFollowingRef.current) return
        container.scrollTop = Math.max(0, container.scrollHeight - container.clientHeight)
        setShowJumpToLatest(false)
      })
    })
  }, [])

  const handleScroll = useCallback<UIEventHandler<HTMLDivElement>>(
    (event) => syncScrollState(event.currentTarget),
    [syncScrollState]
  )

  const jumpToLatest = useCallback((): void => {
    const container = scrollContainerRef.current
    if (!container) return

    clearSmoothScroll()
    smoothScrollRef.current = true
    isFollowingRef.current = true
    setShowJumpToLatest(false)
    container.scrollTo({
      top: Math.max(0, container.scrollHeight - container.clientHeight),
      behavior: 'smooth'
    })
    smoothScrollTimerRef.current = setTimeout(() => {
      smoothScrollRef.current = false
      smoothScrollTimerRef.current = null
      const currentContainer = scrollContainerRef.current
      if (currentContainer) syncScrollState(currentContainer)
    }, SMOOTH_SCROLL_FALLBACK_MS)
  }, [clearSmoothScroll, syncScrollState])

  useEffect(() => {
    const startedTurn = active && !wasActiveRef.current
    wasActiveRef.current = active
    if (startedTurn) scheduleScrollToBottom()
  }, [active, scheduleScrollToBottom])

  useEffect(() => {
    clearSmoothScroll()
    scheduleScrollToBottom()
  }, [clearSmoothScroll, resetKey, scheduleScrollToBottom])

  useEffect(() => {
    if (!active || !isFollowingRef.current) return
    scheduleScrollToBottom()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps supplied by caller
  }, [active, scheduleScrollToBottom, ...deps])

  useEffect(() => {
    if (!enabled) return

    const container = scrollContainerRef.current
    if (!container) return

    const content = container.firstElementChild
    if (!(content instanceof HTMLElement)) return

    const observer = new ResizeObserver(() => {
      if (isFollowingRef.current) {
        scheduleScrollToBottom()
      } else {
        syncScrollState(container)
      }
    })

    observer.observe(content)
    if (isFollowingRef.current) {
      scheduleScrollToBottom()
    } else {
      syncScrollState(container)
    }

    return () => observer.disconnect()
  }, [enabled, scheduleScrollToBottom, syncScrollState, resetKey])

  useEffect(
    () => () => {
      if (scheduledFrameRef.current !== null) {
        cancelAnimationFrame(scheduledFrameRef.current)
      }
      clearSmoothScroll()
    },
    [clearSmoothScroll]
  )

  return {
    scrollContainerRef,
    handleScroll,
    showJumpToLatest,
    jumpToLatest
  }
}
