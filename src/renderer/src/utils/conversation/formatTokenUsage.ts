import type { ChatTokenUsage } from '../../types/project'

function formatTokenCount(count: number): string {
  if (count >= 10_000) {
    return `${(count / 1000).toFixed(1)}k`
  }
  return count.toLocaleString('en-US')
}

export function formatTokenUsage(usage: ChatTokenUsage): string {
  const parts = [
    `${formatTokenCount(usage.inputTokens)} in`,
    `${formatTokenCount(usage.outputTokens)} out`
  ]

  if (usage.cacheReadInputTokens) {
    parts.push(`${formatTokenCount(usage.cacheReadInputTokens)} cache`)
  }

  return `Tokens: ${parts.join(' · ')}`
}
