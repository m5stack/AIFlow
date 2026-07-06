import React, { useCallback, useLayoutEffect, useRef, useState } from 'react'

export interface PanelTabItem<T extends string = string> {
  id: T
  label: string
}

interface PanelTabsProps<T extends string> {
  tabs: PanelTabItem<T>[]
  activeId: T
  onChange: (id: T) => void
}

function tabButtonClass(isActive: boolean): string {
  return `panel-tab relative z-[1] inline-flex shrink-0 cursor-pointer items-center px-3 py-2 transition-colors duration-200 ${
    isActive ? 'text-ink' : 'text-muted hover:text-ink'
  }`
}

export default function PanelTabs<T extends string>({
  tabs,
  activeId,
  onChange
}: PanelTabsProps<T>): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef(new Map<T, HTMLButtonElement>())
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })

  const updateIndicator = useCallback(() => {
    const tab = tabRefs.current.get(activeId)
    const container = containerRef.current
    if (!tab || !container) return
    setIndicator({
      left: tab.offsetLeft,
      width: tab.offsetWidth
    })
  }, [activeId])

  useLayoutEffect(() => {
    updateIndicator()
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(() => updateIndicator())
    observer.observe(container)
    return () => observer.disconnect()
  }, [updateIndicator, tabs])

  const setTabRef = (id: T) => (element: HTMLButtonElement | null) => {
    if (element) tabRefs.current.set(id, element)
    else tabRefs.current.delete(id)
  }

  return (
    <div ref={containerRef} className="relative flex min-w-0 items-end gap-0">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          ref={setTabRef(tab.id)}
          type="button"
          className={tabButtonClass(activeId === tab.id)}
          aria-selected={activeId === tab.id}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
      <span
        aria-hidden
        className="panel-tab-indicator pointer-events-none absolute bottom-0 h-1 rounded-full bg-panel-tab-indicator"
        style={{ left: indicator.left, width: indicator.width }}
      />
    </div>
  )
}

interface PanelTabPaneProps {
  children: React.ReactNode
  className?: string
}

export function PanelTabPane({ children, className = '' }: PanelTabPaneProps): React.JSX.Element {
  return (
    <div className={`panel-tab-pane flex min-h-0 flex-1 flex-col ${className}`.trim()}>
      {children}
    </div>
  )
}
