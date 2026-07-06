import React from 'react'
import { DatabaseIcon } from '../icons/Icons'

export default function EzDataTab(): React.JSX.Element {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
      <DatabaseIcon size={28} className="opacity-80" />
      <p className="text-[13px] text-muted">EzData coming soon</p>
    </div>
  )
}
