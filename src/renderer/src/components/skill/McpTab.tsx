import React from 'react'
import { McpIcon } from '../icons/Icons'

export default function McpTab(): React.JSX.Element {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
      <McpIcon size={28} className="opacity-80" />
      <p className="text-[13px] text-muted">MCP servers coming soon</p>
    </div>
  )
}
