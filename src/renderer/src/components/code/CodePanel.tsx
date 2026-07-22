import React, { useState } from 'react'
import { Button, toast } from '@heroui/react'
import CodeEditor from './CodeEditor'
import { CodeIcon, DownloadIcon, PlayIcon } from '../icons/Icons'
import PanelShell from '../layout/PanelShell'
import { useActiveProjectDevices } from '../../hooks/useActiveProjectDevices'
import { useClientIdStore } from '../../stores/clientIdStore'
import { useDeviceFilePreviewStore } from '../../stores/deviceFilePreviewStore'
import { useFlowStatusStore } from '../../stores/flowStatusStore'
import { useProjectStore } from '../../stores/projectStore'
import { runProjectOnDevice } from '../../utils/device/runProjectOnDevice'
import './code-panel.css'

export default function CodePanel(): React.JSX.Element {
  const clientId = useClientIdStore((s) => s.clientId)
  const codeFilePath = useProjectStore((s) => s.codeFilePath)
  const selectedFile = useProjectStore((s) => s.selectedFile)
  const selectedFileContent = useProjectStore((s) => s.selectedFileContent)
  const selectedFileLanguage = useProjectStore((s) => s.selectedFileLanguage)
  const updateProjectFileContent = useProjectStore((s) => s.updateProjectFileContent)
  const setDeviceGlow = useFlowStatusStore((s) => s.setDevice)
  const { activeProjectId, activeProject, selectedDevice } = useActiveProjectDevices()
  const [isRunning, setIsRunning] = useState(false)

  const devicePreview = useDeviceFilePreviewStore((s) => s.selectedFile)
  const devicePreviewLoading = useDeviceFilePreviewStore((s) => s.isLoading)
  const devicePreviewError = useDeviceFilePreviewStore((s) => s.error)
  const markPreviewLoadFailed = useDeviceFilePreviewStore((s) => s.markPreviewLoadFailed)

  const hasActiveProject = !!activeProject
  const canRun = !!activeProjectId && !!selectedDevice?.id && !selectedDevice.invalid && !isRunning
  const showDevicePreview = devicePreviewLoading || !!devicePreviewError || devicePreview !== null

  const selectedFileName = showDevicePreview
    ? (devicePreview?.name ?? 'Device file')
    : (selectedFile?.name ?? 'main.py')
  const showImagePreview = showDevicePreview
    ? devicePreview?.kind === 'image' && !!devicePreview.url
    : selectedFile?.kind === 'image' && !!selectedFile.url
  const showDeviceUnsupportedPreview = showDevicePreview && devicePreview?.kind === 'unsupported'
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

  const runOnDevice = async (includeMainPyInDownload: boolean): Promise<void> => {
    if (!activeProjectId || !activeProject) {
      toast.danger('Please select a project first.')
      return
    }
    if (!selectedDevice?.id) {
      toast.danger('Please select a device for this project.')
      return
    }
    if (selectedDevice.invalid) {
      toast.danger('This device is invalid. Please select or add another device.')
      return
    }

    setIsRunning(true)
    setDeviceGlow('running')
    try {
      const { ran } = await runProjectOnDevice({
        projectId: activeProjectId,
        projectName: activeProject.projectName,
        deviceId: selectedDevice.id,
        clientId,
        fileNodes: activeProject.files ?? [],
        selectedPath: codeFilePath ?? undefined,
        selectedContent: selectedFileContent,
        includeMainPyInDownload
      })
      if (!ran) {
        setDeviceGlow('idle')
        toast.danger('No code to run. Add main.py content first.')
        return
      }
      setDeviceGlow('success')
      toast.success(
        includeMainPyInDownload ? 'Files downloaded and code sent.' : 'Code sent to device.'
      )
    } catch (error) {
      setDeviceGlow('failed')
      toast.danger(`Run failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsRunning(false)
    }
  }

  const headerActions = (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        className="code-panel-run-action h-7 min-h-7 min-w-0 shrink-0 gap-1 rounded-md px-2 text-[11px] font-semibold"
        isDisabled={!canRun}
        onPress={() => void runOnDevice(false)}
      >
        <PlayIcon size={10} />
        {isRunning ? 'Running…' : 'Run Once'}
      </Button>
      <Button
        size="sm"
        className="code-panel-run-action h-7 min-h-7 min-w-0 shrink-0 gap-1 rounded-md px-2 text-[11px] font-semibold"
        isDisabled={!canRun}
        onPress={() => void runOnDevice(true)}
      >
        <DownloadIcon size={10} />
        {isRunning ? 'Running…' : 'Run Always'}
      </Button>
    </div>
  )

  return (
    <PanelShell
      title="MicroPython"
      icon={<CodeIcon size={16} />}
      actions={headerActions}
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
            onCodeChange={
              showDevicePreview
                ? undefined
                : hasActiveProject
                  ? updateProjectFileContent
                  : undefined
            }
          />
        )}
      </div>
    </PanelShell>
  )
}
