import React, { useEffect } from 'react'
import { Toast } from '@heroui/react'
import TopBar from './TopBar'
import FlowBar from './FlowBar'
import ConversationThreadPanel from '../conversation/ConversationThreadPanel'
import SkillPanel from '../skill/SkillPanel'
import CodePanel from '../code/CodePanel'
import DataPanel from '../data/DataPanel'
import FilePanel from '../files/FilePanel'
import TerminalPanel from '../terminal/TerminalPanel'
import NewProjectDialog from '../project/NewProjectDialog'
import AgentPermissionDialog from '../conversation/AgentPermissionDialog'
import { useAgentSession } from '../../hooks/useAgentSession'
import { useColumnResize } from '../../hooks/useColumnResize'
import { useProjectStore } from '../../stores/projectStore'
import ResizeEdge from './ResizeEdge'

export default function WorkspaceLayout(): React.JSX.Element {
  const session = useAgentSession()
  const showNewProjectDialog = useProjectStore((s) => s.showNewProjectDialog)
  const setShowNewProjectDialog = useProjectStore((s) => s.setShowNewProjectDialog)
  const createProject = useProjectStore((s) => s.createProject)
  const initializeProjects = useProjectStore((s) => s.initialize)

  const {
    containerRef,
    gridTemplateColumns,
    cssVariables,
    handlePositions,
    draggingIndex,
    onResizeStart
  } = useColumnResize()

  useEffect(() => {
    void initializeProjects()
  }, [initializeProjects])

  return (
    <div className="flex h-screen min-h-0 flex-col gap-2.5 overflow-hidden px-5 pb-4 pt-2.5">
      <TopBar onNewProject={() => setShowNewProjectDialog(true)} />

      <section
        ref={containerRef}
        className="relative grid min-h-0 flex-1 gap-x-4 gap-y-1 overflow-visible grid-rows-[minmax(150px,0.48fr)_minmax(0,auto)_minmax(0,1fr)]"
        style={{ ...cssVariables, gridTemplateColumns }}
      >
        <SkillPanel />
        <div className="min-h-0 min-w-0 overflow-hidden [&>section]:h-full">
          <FilePanel />
        </div>
        <DataPanel />
        <FlowBar
          promptTemplateProps={{
            ...session.promptTemplateProps,
            disabled: session.chatInputProps.disabled
          }}
        />
        <ConversationThreadPanel session={session} />
        <CodePanel />
        <TerminalPanel />
        <ResizeEdge
          axis="col"
          left={handlePositions[0]}
          isDragging={draggingIndex === 0}
          onMouseDown={(e) => onResizeStart(0, e)}
        />
        <ResizeEdge
          axis="col"
          left={handlePositions[1]}
          isDragging={draggingIndex === 1}
          onMouseDown={(e) => onResizeStart(1, e)}
        />
      </section>

      <NewProjectDialog
        isOpen={showNewProjectDialog}
        onClose={() => setShowNewProjectDialog(false)}
        onConfirm={createProject}
      />
      <AgentPermissionDialog
        request={session.activePermission}
        onRespond={session.respondPermission}
      />
      <Toast.Provider placement="top end" />
    </div>
  )
}
