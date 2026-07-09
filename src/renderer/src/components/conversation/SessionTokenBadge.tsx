import React from 'react'
import { useSessionTokenUsageStore } from '../../stores/sessionTokenUsageStore'
import { formatTokenCount } from '../../utils/conversation/formatTokenUsage'

export default function SessionTokenBadge(): React.JSX.Element | null {
  const totalTokens = useSessionTokenUsageStore((s) => s.totalTokens)

  if (totalTokens <= 0) return null

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border bg-surface px-2 py-0.5 text-[11px] font-semibold text-muted"
      title={`Session tokens: ${totalTokens.toLocaleString('en-US')}`}
      aria-label={`Session token usage: ${formatTokenCount(totalTokens)} tokens`}
    >
      <span className="tabular-nums">{formatTokenCount(totalTokens)}</span>
      <span className="text-[10px] font-medium opacity-70">tokens</span>
    </span>
  )
}
