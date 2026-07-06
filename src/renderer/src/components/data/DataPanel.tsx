import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { deleteDeviceFile, getDeviceFileList } from '../../api/device'
import type { DeviceFile } from '../../types/device'
import { useActiveProjectDevices } from '../../hooks/useActiveProjectDevices'
import { useClientIdStore } from '../../stores/clientIdStore'
import { useDeviceFilePreviewStore } from '../../stores/deviceFilePreviewStore'
import { useDeviceStore } from '../../stores/deviceStore'
import { ChevronLeftIcon, CodeIcon, FolderIcon, RefreshIcon, TrashIcon } from '../icons/Icons'
import PanelShell from '../layout/PanelShell'

const ROOT_PATH = ''

const isLikelyDirectory = (name: string): boolean => !name.includes('.')

const compareDeviceFiles = (a: DeviceFile, b: DeviceFile): number => {
  const aIsDir = isLikelyDirectory(a.name)
  const bIsDir = isLikelyDirectory(b.name)
  if (aIsDir !== bIsDir) return aIsDir ? -1 : 1
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
}

const parentPath = (path: string): string => {
  const trimmed = path.replace(/\/+$/, '')
  if (!trimmed) return ''
  const lastSlash = trimmed.lastIndexOf('/')
  return lastSlash === -1 ? '' : trimmed.slice(0, lastSlash)
}

const buildFilePath = (dirPath: string, fileName: string): string =>
  dirPath ? `${dirPath}/${fileName}` : fileName

export default function DataPanel(): React.JSX.Element {
  const clientId = useClientIdStore((s) => s.clientId)
  const { selectedDevice } = useActiveProjectDevices()
  const allDevices = useDeviceStore((s) => s.devices)
  const loadPreview = useDeviceFilePreviewStore((s) => s.loadPreview)
  const clearPreview = useDeviceFilePreviewStore((s) => s.clearPreview)
  const selectedDeviceFilePath = useDeviceFilePreviewStore((s) => s.selectedFile?.path ?? null)

  const displayDevice = useMemo(() => {
    if (selectedDevice && !selectedDevice.invalid) return selectedDevice
    return allDevices.find((device) => !device.invalid) ?? allDevices[0]
  }, [selectedDevice, allDevices])

  const [currentPath, setCurrentPath] = useState(ROOT_PATH)
  const [fileList, setFileList] = useState<DeviceFile[]>([])
  const [fsPath, setFsPath] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const [deletingFile, setDeletingFile] = useState<string | null>(null)

  useEffect(() => {
    setCurrentPath(ROOT_PATH)
    clearPreview()
  }, [clearPreview, displayDevice?.id])

  useEffect(() => {
    clearPreview()
  }, [clearPreview, currentPath])

  const fetchFiles = useCallback(async () => {
    if (!displayDevice?.id) {
      setFileList([])
      setFsPath('')
      setError(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const response = await getDeviceFileList({
        deviceId: displayDevice.id,
        clientId,
        filePath: currentPath
      })
      setFileList(response.file_list ?? [])
      setFsPath(response.fs_path ?? currentPath)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load device files')
      setFileList([])
      setFsPath('')
    } finally {
      setIsLoading(false)
    }
  }, [clientId, currentPath, displayDevice?.id])

  useEffect(() => {
    void fetchFiles()
  }, [fetchFiles, refreshTick])

  const handleOpenFolder = (name: string): void => {
    const nextPath = fsPath ? `${fsPath}/${name}` : name
    setCurrentPath(nextPath)
  }

  const handleGoBack = (): void => {
    const nextPath = parentPath(fsPath)
    setCurrentPath(nextPath || ROOT_PATH)
  }

  const handleRefresh = (): void => {
    setRefreshTick((tick) => tick + 1)
  }

  const handlePreview = (fileName: string): void => {
    if (!displayDevice?.id) return

    void loadPreview({
      deviceId: displayDevice.id,
      clientId,
      filePath: buildFilePath(fsPath, fileName),
      fileName
    })
  }

  const handleDelete = async (fileName: string): Promise<void> => {
    if (!displayDevice?.id || deletingFile) return
    if (!window.confirm(`Delete ${fileName}?`)) return

    const filePath = buildFilePath(fsPath, fileName)
    setDeletingFile(fileName)
    try {
      await deleteDeviceFile({
        deviceId: displayDevice.id,
        clientId,
        filePath
      })
      if (selectedDeviceFilePath === filePath) {
        clearPreview()
      }
      handleRefresh()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to delete file')
    } finally {
      setDeletingFile(null)
    }
  }

  const sortedFileList = useMemo(
    () => [...fileList].sort(compareDeviceFiles),
    [fileList]
  )

  const showStatus = !displayDevice?.id || isLoading || !!error || sortedFileList.length === 0

  const renderStatus = (): React.ReactNode => {
    if (!displayDevice?.id) {
      return <div className="text-[13px] text-muted">No device selected</div>
    }

    if (isLoading) {
      return <div className="text-[13px] text-muted">Loading device files…</div>
    }

    if (error) {
      return <div className="text-[13px] text-muted">{error}</div>
    }

    return <div className="text-[13px] text-muted">No files</div>
  }

  const renderFileList = (): React.ReactNode => (
    <div className="grid gap-2">
      {sortedFileList.map((file) => {
        const isDirectory = isLikelyDirectory(file.name)
        const filePath = buildFilePath(fsPath, file.name)
        const isActive = selectedDeviceFilePath === filePath
        const isDeleting = deletingFile === file.name
        return (
          <div
            key={file.name}
            className={`group flex h-9 items-center gap-2 rounded-lg border px-3 text-[14px] transition-colors ${
              isActive
                ? 'border-accent bg-accent-bg text-ink'
                : 'border-line bg-surface-2 text-ink hover:bg-soft'
            }`}
          >
            {isDirectory ? (
              <button
                type="button"
                className="inline-flex min-w-0 flex-1 items-center gap-2 truncate text-left"
                onClick={() => handleOpenFolder(file.name)}
              >
                <FolderIcon size={14} className="shrink-0 text-muted" />
                <span className="truncate">{file.name}</span>
              </button>
            ) : (
              <>
                <CodeIcon size={14} className="shrink-0 text-muted" />
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left"
                  onClick={() => handlePreview(file.name)}
                >
                  {file.name}
                </button>
                {file.md5 ? (
                  <span className="max-w-[120px] shrink-0 truncate text-[11px] text-muted">
                    {file.md5}
                  </span>
                ) : null}
                <button
                  type="button"
                  className="inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded text-[#ff6b6b] opacity-0 transition-all hover:bg-soft group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={`Delete ${file.name}`}
                  disabled={isDeleting}
                  onClick={() => void handleDelete(file.name)}
                >
                  <TrashIcon size={12} />
                </button>
              </>
            )}
          </div>
        )
      })}
    </div>
  )

  return (
    <PanelShell
      title="Device Files"
      icon={<FolderIcon size={15} />}
      actions={
        <button
          type="button"
          onClick={handleRefresh}
          disabled={!displayDevice?.id || isLoading}
          aria-label="Refresh"
          className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-line bg-surface-2 text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RefreshIcon size={12} />
        </button>
      }
      bodyClassName="flex min-h-0 flex-col overflow-y-auto"
    >
      {fsPath ? (
        <div className="mb-3 flex items-center gap-2 text-[12px] text-muted">
          <button
            type="button"
            className="inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded border border-line bg-surface-2 transition-colors hover:text-ink"
            aria-label="Go back"
            onClick={handleGoBack}
          >
            <ChevronLeftIcon size={12} />
          </button>
          <span className="truncate font-medium text-ink">{fsPath}</span>
        </div>
      ) : null}
      {showStatus ? (
        <div className="flex flex-1 items-center justify-center text-center">{renderStatus()}</div>
      ) : (
        renderFileList()
      )}
    </PanelShell>
  )
}
