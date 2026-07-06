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
      <header className="flex h-10 shrink-0 items-stretch justify-between gap-3 border-b border-line bg-surface-2 px-4">
        <div className="flex min-w-0 flex-1 items-stretch gap-2">
          {icon && (
            <span
              className={`inline-flex size-[18px] shrink-0 items-center justify-center ${
                typeof title === 'string' ? 'self-center' : 'mb-2 self-end'
              }`}
            >
              {icon}
            </span>
          )}
          {typeof title === 'string' ? (
            <span className="self-center truncate text-[15px] font-bold leading-[18px]">
              {title}
            </span>
          ) : (
            <div className="flex min-w-0 items-end">{title}</div>
          )}
          {titleActions ? (
            <div className="flex shrink-0 self-center items-center">{titleActions}</div>
          ) : null}
        </div>
        {actions && <div className="flex shrink-0 self-center items-center">{actions}</div>}
      </header>
      <div className={`min-h-0 flex-1 overflow-hidden ${bodyClassName}`}>{children}</div>
    </section>
  )
}
