import React from 'react'

interface PanelShellProps {
  title: React.ReactNode
  icon?: React.ReactNode
  titleActions?: React.ReactNode
  actions?: React.ReactNode
  className?: string
  bodyClassName?: string
  children: React.ReactNode
}

export default function PanelShell({
  title,
  icon,
  titleActions,
  actions,
  className = '',
  bodyClassName = '',
  children
}: PanelShellProps): React.JSX.Element {
  return (
    <section
      className={`flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-line bg-surface/95 shadow-[var(--panel-shadow)] ${className}`}
    >
      <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-line bg-surface-2 px-4">
        <div className="flex min-w-0 items-center gap-2">
          {icon && (
            <span className="inline-flex size-[18px] shrink-0 items-center justify-center">
              {icon}
            </span>
          )}
          <span className="truncate text-[15px] font-bold leading-[18px]">{title}</span>
          {titleActions}
        </div>
        {actions}
      </header>
      <div className={`min-h-0 flex-1 overflow-hidden p-3.5 ${bodyClassName}`}>{children}</div>
    </section>
  )
}
