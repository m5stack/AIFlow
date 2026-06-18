import { app } from 'electron'
import { join } from 'path'

export function getClaudeExecutablePath(): string {
  const binName = process.platform === 'win32' ? 'claude.exe' : 'claude'
  if (app.isPackaged) {
    return join(process.resourcesPath, binName)
  }
  return join(
    __dirname,
    '../../node_modules',
    `@anthropic-ai/claude-agent-sdk-${process.platform}-${process.arch}`,
    binName
  )
}
