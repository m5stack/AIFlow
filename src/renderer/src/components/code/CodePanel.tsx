import React from 'react'
import CodeEditor from './CodeEditor'
import { CodeIcon } from '../icons/Icons'
import PanelShell from '../layout/PanelShell'
import { useProjectStore } from '../../stores/projectStore'

export default function CodePanel(): React.JSX.Element {
  const projects = useProjectStore((s) => s.projects)
  const activeProjectId = useProjectStore((s) => s.activeProjectId)
  const selectedFile = useProjectStore((s) => s.selectedFile)
  const selectedFileContent = useProjectStore((s) => s.selectedFileContent)
  const selectedFileLanguage = useProjectStore((s) => s.selectedFileLanguage)
  const updateProjectFileContent = useProjectStore((s) => s.updateProjectFileContent)

  const activeProject = projects.find((p) => p.id === activeProjectId)
  const hasActiveProject = !!activeProject
  const selectedFileName = selectedFile?.name ?? 'main.py'
  const showImagePreview = selectedFile?.kind === 'image' && !!selectedFile.url
  const showResourcePlaceholder = selectedFile?.kind === 'resource'

  return (
    <PanelShell
      title="MicroPython"
      icon={<CodeIcon size={16} />}
      actions={<span className="shrink-0 truncate text-[13px] text-muted">{selectedFileName}</span>}
      bodyClassName="min-h-0 overflow-hidden p-0"
    >
      <div className="h-full min-h-0 overflow-hidden rounded-[7px] bg-code-editor">
        {showImagePreview ? (
          <div className="flex h-full items-center justify-center p-6">
            <img
              src={selectedFile.url}
              alt={selectedFileName}
              className="max-h-full max-w-full rounded-lg border border-line object-contain"
            />
          </div>
        ) : showResourcePlaceholder ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-[13px] text-muted">Preview not supported</div>
          </div>
        ) : (
          <CodeEditor
            value={hasActiveProject ? selectedFileContent : ''}
            language={selectedFileLanguage}
            readOnly={!hasActiveProject}
            onCodeChange={hasActiveProject ? updateProjectFileContent : undefined}
          />
        )}
      </div>
    </PanelShell>
  )
}
