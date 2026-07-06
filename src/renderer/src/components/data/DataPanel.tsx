import React, { useState } from 'react'
import { DatabaseIcon, FolderIcon } from '../icons/Icons'
import PanelShell from '../layout/PanelShell'
import PanelTabs, { PanelTabPane } from '../layout/PanelTabs'
import DeviceFilesTab from './DeviceFilesTab'
import EzDataTab from './EzDataTab'

type DataPanelTab = 'ezdata' | 'devicefiles'

const TABS = [
  { id: 'ezdata' as const, label: 'EzData' },
  { id: 'devicefiles' as const, label: 'Device Files' }
]

export default function DataPanel(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<DataPanelTab>('ezdata')

  const headerIcon =
    activeTab === 'ezdata' ? <DatabaseIcon size={16} /> : <FolderIcon size={15} />

  return (
    <PanelShell
      icon={headerIcon}
      title={
        <PanelTabs tabs={TABS} activeId={activeTab} onChange={setActiveTab} />
      }
      bodyClassName="flex min-h-0 flex-col overflow-hidden"
    >
      <PanelTabPane key={activeTab} className="flex flex-col overflow-hidden">
        {activeTab === 'ezdata' ? <EzDataTab /> : <DeviceFilesTab />}
      </PanelTabPane>
    </PanelShell>
  )
}
