import React from 'react'
import CodeEditor from './CodeEditor'
import { CodeIcon } from '../icons/Icons'
import PanelShell from '../layout/PanelShell'
import { useDeviceFilePreviewStore } from '../../stores/deviceFilePreviewStore'
import { useProjectStore } from '../../stores/projectStore'

export default function CodePanel(): React.JSX.Element {
  const projects = useProjectStore((s) => s.projects)
  const activeProjectId = useProjectStore((s) => s.activeProjectId)
  const selectedFile = useProjectStore((s) => s.selectedFile)
  const selectedFileContent = useProjectStore((s) => s.selectedFileContent)
  const selectedFileLanguage = useProjectStore((s) => s.selectedFileLanguage)
  const updateProjectFileContent = useProjectStore((s) => s.updateProjectFileContent)

  const devicePreview = useDeviceFilePreviewStore((s) => s.selectedFile)
  const devicePreviewLoading = useDeviceFilePreviewStore((s) => s.isLoading)
  const devicePreviewError = useDeviceFilePreviewStore((s) => s.error)
  const markPreviewLoadFailed = useDeviceFilePreviewStore((s) => s.markPreviewLoadFailed)

  const activeProject = projects.find((p) => p.id === activeProjectId)
  const hasActiveProject = !!activeProject
  const showDevicePreview =
    devicePreviewLoading || !!devicePreviewError || devicePreview !== null

  const selectedFileName = showDevicePreview
    ? (devicePreview?.name ?? 'Device file')
    : (selectedFile?.name ?? 'main.py')
  const showImagePreview =
    showDevicePreview
      ? devicePreview?.kind === 'image' && !!devicePreview.url
      : selectedFile?.kind === 'image' && !!selectedFile.url
  const showDeviceUnsupportedPreview =
    showDevicePreview && devicePreview?.kind === 'unsupported'
  const showResourcePlaceholder = !showDevicePreview && selectedFile?.kind === 'resource'

  const editorValue = showDevicePreview
    ? devicePreview?.kind === 'text'
      ? (devicePreview.content ?? '')
      : ''
    : hasActiveProject
      ? selectedFileContent
      : ''
  const editorLanguage = showDevicePreview
    ? (devicePreview?.language ?? 'plaintext')
    : selectedFileLanguage

  return (
    <PanelShell
      title="MicroPython"
      icon={<CodeIcon size={16} />}
      actions={<span className="shrink-0 truncate text-[13px] text-muted">{selectedFileName}</span>}
      bodyClassName="min-h-0 overflow-hidden p-0"
    >
      <div className="h-full min-h-0 overflow-hidden rounded-[7px] bg-code-editor">
        {devicePreviewLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-[13px] text-muted">Loading preview…</div>
          </div>
        ) : devicePreviewError ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-[13px] text-muted">{devicePreviewError}</div>
          </div>
        ) : showImagePreview ? (
          <div className="flex h-full items-center justify-center p-6">
            <img
              src={showDevicePreview ? devicePreview?.url : selectedFile?.url}
              alt={selectedFileName}
              className="max-h-full max-w-full rounded-lg border border-line object-contain"
              onError={() => {
                if (showDevicePreview) markPreviewLoadFailed()
              }}
            />
          </div>
        ) : showDeviceUnsupportedPreview ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-[13px] text-muted">Preview not supported</div>
          </div>
        ) : showResourcePlaceholder ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-[13px] text-muted">Preview not supported</div>
          </div>
        ) : (
          <CodeEditor
            value={editorValue}
            language={editorLanguage}
            readOnly={showDevicePreview || !hasActiveProject}
            onCodeChange={showDevicePreview ? undefined : hasActiveProject ? updateProjectFileContent : undefined}
          />
        )}
      </div>
    </PanelShell>
  )
}
