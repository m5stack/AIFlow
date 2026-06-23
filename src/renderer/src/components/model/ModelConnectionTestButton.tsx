import React from 'react'
import { Button } from '@heroui/react'
import type { ModelConnectionTestResult } from '../../../../shared/types'

interface ModelConnectionTestButtonProps {
  isTesting: boolean
  testResult: ModelConnectionTestResult | null
  onTest: () => void
  disabled?: boolean
  className?: string
  showLabel?: boolean
}

export default function ModelConnectionTestButton({
  isTesting,
  testResult,
  onTest,
  disabled = false,
  className,
  showLabel = true
}: ModelConnectionTestButtonProps): React.JSX.Element {
  const statusText = isTesting
    ? 'Testing connection...'
    : testResult?.message
  const statusTone = isTesting
    ? 'text-[var(--muted)]'
    : testResult?.ok
      ? 'text-[var(--status-connected)]'
      : 'text-[var(--flow-pink)]'

  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ''}`}>
      {showLabel && (
        <span className="text-[12px] font-medium text-default-500">Connection</span>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5">
        <Button
          variant="ghost"
          className="h-8 shrink-0 cursor-pointer border border-accent bg-accent-bg px-3 text-[12px] font-medium text-accent transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => {
            void onTest()
          }}
          isDisabled={disabled || isTesting}
        >
          {isTesting ? 'Testing...' : 'Test connection'}
        </Button>
        {statusText && (
          <span
            className={`min-w-0 flex-1 text-[11px] leading-snug break-words ${statusTone}`}
          >
            {statusText}
          </span>
        )}
      </div>
    </div>
  )
}
