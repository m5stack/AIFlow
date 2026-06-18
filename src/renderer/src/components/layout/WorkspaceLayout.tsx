import React, { useEffect } from 'react'
import { Toast } from '@heroui/react'
import TopBar from './TopBar'
import FlowBar from './FlowBar'
import ConversationThreadPanel from '../conversation/ConversationThreadPanel'
import ConversationComposerPanel from '../conversation/ConversationComposerPanel'
import CodePanel from '../code/CodePanel'
import DataPanel from '../data/DataPanel'
import FilePanel from '../files/FilePanel'
import TerminalPanel from '../terminal/TerminalPanel'
import NewProjectDialog from '../project/NewProjectDialog'
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
    isDesktop,
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
        className="relative grid min-h-0 flex-1 gap-x-4 gap-y-1 overflow-visible max-[1059px]:auto-rows-auto max-[1059px]:overflow-visible lg:grid-rows-[minmax(0,1fr)_minmax(0,auto)_minmax(150px,0.48fr)]"
        style={{
          ...cssVariables,
          ...(gridTemplateColumns ? { gridTemplateColumns } : {})
        }}
      >
        <ConversationThreadPanel session={session} />
        <CodePanel />
        <DataPanel />
        <FlowBar />
        <ConversationComposerPanel session={session} />
        <div className="min-h-0 min-w-0 overflow-hidden [&>section]:h-full">
          <FilePanel />
        </div>
        <TerminalPanel />
        {isDesktop && (
          <>
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
          </>
        )}
      </section>

      <NewProjectDialog
        isOpen={showNewProjectDialog}
        onClose={() => setShowNewProjectDialog(false)}
        onConfirm={createProject}
      />
      <Toast.Provider placement="top end" />
    </div>
  )
}
