import React from 'react'
import { DatabaseIcon } from '../icons/Icons'
import PanelShell from '../layout/PanelShell'

export default function DataPanel(): React.JSX.Element {
  return (
    <PanelShell
      title="Data"
      icon={<DatabaseIcon size={15} />}
      bodyClassName="flex min-h-0 items-center justify-center overflow-y-auto"
    >
      <div className="text-[13px] text-muted">Coming soon</div>
    </PanelShell>
  )
}
