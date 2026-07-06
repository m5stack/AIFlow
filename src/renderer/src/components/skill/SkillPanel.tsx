import React, { useState } from 'react'
import PanelShell from '../layout/PanelShell'
import PanelTabs, { PanelTabPane } from '../layout/PanelTabs'
import { McpIcon, SkillIcon } from '../icons/Icons'
import McpTab from './McpTab'
import SkillTab from './SkillTab'

type SkillPanelTab = 'skill' | 'mcp'

const TABS = [
  { id: 'skill' as const, label: 'Skill' },
  { id: 'mcp' as const, label: 'MCP' }
]

export default function SkillPanel(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<SkillPanelTab>('skill')

  const headerIcon = activeTab === 'skill' ? <SkillIcon size={16} /> : <McpIcon size={16} />

  return (
    <PanelShell
      icon={headerIcon}
      title={
        <PanelTabs tabs={TABS} activeId={activeTab} onChange={setActiveTab} />
      }
      bodyClassName="flex min-h-0 flex-col p-3.5"
    >
      <PanelTabPane key={activeTab}>
        {activeTab === 'skill' ? <SkillTab /> : <McpTab />}
      </PanelTabPane>
    </PanelShell>
  )
}
