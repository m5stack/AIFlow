import { useCallback, useEffect, useRef, type RefObject } from 'react'

type UseChatAutoScrollOptions = {
  /** When true, new content triggers auto-scroll to the bottom. */
  active: boolean
  /** Extra values that should trigger a scroll attempt while active. */
  deps?: unknown[]
}

type UseChatAutoScrollResult = {
  scrollContainerRef: RefObject<HTMLDivElement | null>
  messagesEndRef: RefObject<HTMLDivElement | null>
}

export function useChatAutoScroll({
  active,
  deps = []
}: UseChatAutoScrollOptions): UseChatAutoScrollResult {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    const run = (): void => {
      const container = scrollContainerRef.current
      if (!container) return
      container.scrollTop = Math.max(0, container.scrollHeight - container.clientHeight)
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(run)
    })
  }, [])

  useEffect(() => {
    if (!active) return
    scrollToBottom()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps supplied by caller
  }, [active, scrollToBottom, ...deps])

  useEffect(() => {
    if (!active) return

    const container = scrollContainerRef.current
    if (!container) return

    const content = container.firstElementChild
    if (!(content instanceof HTMLElement)) return

    const observer = new ResizeObserver(() => {
      scrollToBottom()
    })

    observer.observe(content)
    scrollToBottom()

    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps supplied by caller
  }, [active, scrollToBottom, ...deps])

  return {
    scrollContainerRef,
    messagesEndRef
  }
}
