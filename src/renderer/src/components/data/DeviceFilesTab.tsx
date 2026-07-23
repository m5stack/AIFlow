import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Tooltip, toast } from '@heroui/react'
import { deleteDeviceFile, getDeviceFileTree } from '../../api/device'
import type { DeviceFile, DeviceFileTreeNode } from '../../types/device'
import {
  useActiveProjectDevices,
  type SelectedProjectDevice
} from '../../hooks/useActiveProjectDevices'
import { useClientIdStore } from '../../stores/clientIdStore'
import { useDeviceFilePreviewStore } from '../../stores/deviceFilePreviewStore'
import {
  requestDeviceFileTreeRefresh,
  useDeviceFileTreeStore
} from '../../stores/deviceFileTreeStore'
import { useDeviceStore } from '../../stores/deviceStore'
import { isImagePath } from '../../../../shared/fileExtensions'
import { setDeviceStartupFile } from '../../utils/device/setDeviceStartupFile'
import {
  ChevronLeftIcon,
  CodeIcon,
  FolderIcon,
  ImageIcon,
  RefreshIcon,
  StartupFileIcon,
  TrashIcon
} from '../icons/Icons'
import { useConfirmDialog } from '../common/confirmDialogContext'

const ROOT_PATH = ''

const compareDeviceFiles = (a: DeviceFile, b: DeviceFile): number => {
  if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
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

const isAppsPythonFile = (dirPath: string, fileName: string): boolean =>
  (dirPath === 'apps' || dirPath.startsWith('apps/')) && fileName.toLowerCase().endsWith('.py')

const resolveTreeNode = (
  tree: DeviceFileTreeNode | null,
  path: string
): DeviceFileTreeNode | null => {
  if (!tree) return null
  if (!path) return tree

  let node: DeviceFileTreeNode | null = tree
  for (const segment of path.split('/')) {
    if (!segment) continue
    if (!node || node[segment] === undefined) return null
    const next = node[segment]
    if (next === null) return null
    node = next
  }
  return node
}

const listTreeEntries = (node: DeviceFileTreeNode | null): DeviceFile[] => {
  if (!node) return []
  return Object.entries(node).map(([name, value]) => ({
    name,
    isDirectory: value !== null
  }))
}

export default function DeviceFilesTab(): React.JSX.Element {
  const { selectedDevice } = useActiveProjectDevices()
  const allDevices = useDeviceStore((s) => s.devices)

  const displayDevice = useMemo(() => {
    if (selectedDevice && !selectedDevice.invalid) return selectedDevice
    return allDevices.find((device) => !device.invalid) ?? allDevices[0]
  }, [selectedDevice, allDevices])

  return <DeviceFilesContent key={displayDevice?.id ?? 'no-device'} displayDevice={displayDevice} />
}

function DeviceFilesContent({
  displayDevice
}: {
  displayDevice: SelectedProjectDevice | undefined
}): React.JSX.Element {
  const clientId = useClientIdStore((s) => s.clientId)
  const loadPreview = useDeviceFilePreviewStore((s) => s.loadPreview)
  const clearPreview = useDeviceFilePreviewStore((s) => s.clearPreview)
  const selectedDeviceFilePath = useDeviceFilePreviewStore((s) => s.selectedFile?.path ?? null)
  const storeDeviceId = useDeviceFileTreeStore((s) => s.deviceId)
  const storeTree = useDeviceFileTreeStore((s) => s.tree)
  const storeRootFsPath = useDeviceFileTreeStore((s) => s.rootFsPath)
  const setDeviceFileTree = useDeviceFileTreeStore((s) => s.setTree)
  const clearDeviceFileTree = useDeviceFileTreeStore((s) => s.clear)
  const confirm = useConfirmDialog()

  const refreshVersion = useDeviceFileTreeStore((s) =>
    displayDevice?.id ? (s.refreshVersionByDeviceId[displayDevice.id] ?? 0) : 0
  )
  const canFetchDeviceFiles =
    !!displayDevice?.id && !displayDevice.invalid && displayDevice.status === 'connected'

  const [currentPath, setCurrentPath] = useState(ROOT_PATH)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingFile, setDeletingFile] = useState<string | null>(null)
  const [settingStartupFile, setSettingStartupFile] = useState<string | null>(null)
  const requestSequenceRef = useRef(0)

  const tree = storeDeviceId === displayDevice?.id ? storeTree : null
  const rootFsPath = storeDeviceId === displayDevice?.id ? storeRootFsPath : ''

  const fsPath = useMemo(
    () => (currentPath ? buildFilePath(rootFsPath, currentPath) : rootFsPath),
    [currentPath, rootFsPath]
  )

  const currentNode = useMemo(() => resolveTreeNode(tree, currentPath), [tree, currentPath])

  const sortedFileList = useMemo(
    () => listTreeEntries(currentNode).sort(compareDeviceFiles),
    [currentNode]
  )

  useEffect(() => {
    clearPreview()
  }, [clearPreview, currentPath])

  const fetchFiles = useCallback(
    async (requestId: number, deviceId: string) => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await getDeviceFileTree({
          deviceId,
          clientId
        })
        if (requestId !== requestSequenceRef.current) return
        setDeviceFileTree(deviceId, response.tree ?? {}, response.fs_path ?? '')
      } catch (err) {
        if (requestId !== requestSequenceRef.current) return
        setError(err instanceof Error ? err.message : 'Failed to load device files')
        clearDeviceFileTree()
      } finally {
        if (requestId === requestSequenceRef.current) setIsLoading(false)
      }
    },
    [clearDeviceFileTree, clientId, setDeviceFileTree]
  )

  useEffect(() => {
    const requestId = ++requestSequenceRef.current
    let scheduledRequest: number | undefined

    if (canFetchDeviceFiles && displayDevice?.id) {
      const deviceId = displayDevice.id
      // Deferring the request lets React StrictMode cancel its development-only
      // probe effect before any network work starts.
      scheduledRequest = window.setTimeout(() => {
        void fetchFiles(requestId, deviceId)
      }, 0)
    }

    return () => {
      if (scheduledRequest !== undefined) window.clearTimeout(scheduledRequest)
      if (requestSequenceRef.current === requestId) {
        requestSequenceRef.current += 1
      }
    }
  }, [canFetchDeviceFiles, displayDevice?.id, fetchFiles, refreshVersion])

  const handleOpenFolder = (name: string): void => {
    const nextPath = currentPath ? `${currentPath}/${name}` : name
    setCurrentPath(nextPath)
  }

  const handleGoBack = (): void => {
    setCurrentPath(parentPath(currentPath) || ROOT_PATH)
  }

  const handleRefresh = (): void => {
    if (!displayDevice?.id || !canFetchDeviceFiles || isLoading) return
    requestDeviceFileTreeRefresh(displayDevice.id)
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
    if (!displayDevice?.id || deletingFile || settingStartupFile) return
    const previewFilePath = buildFilePath(fsPath, fileName)
    const deleteFilePath = buildFilePath(currentPath, fileName)
    const confirmed = await confirm({
      title: 'Delete device file?',
      description: 'This file will be permanently deleted from the device.',
      itemName: previewFilePath,
      confirmLabel: 'Delete'
    })
    if (!confirmed) return

    setDeletingFile(fileName)
    try {
      await deleteDeviceFile({
        deviceId: displayDevice.id,
        clientId,
        filePath: deleteFilePath
      })
      if (selectedDeviceFilePath === previewFilePath) {
        clearPreview()
      }
      requestDeviceFileTreeRefresh(displayDevice.id)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      toast.danger(`Delete device file failed: ${message}`)
    } finally {
      setDeletingFile(null)
    }
  }

  const handleSetStartupFile = async (fileName: string): Promise<void> => {
    if (!displayDevice?.id || deletingFile || settingStartupFile) return
    const filePath = buildFilePath(fsPath, fileName)

    setSettingStartupFile(filePath)
    try {
      await setDeviceStartupFile({
        deviceId: displayDevice.id,
        clientId,
        filePath,
        fileName
      })
      toast.success(`"${fileName}" set as device startup code.`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      toast.danger(`Set startup code failed: ${message}`)
    } finally {
      setSettingStartupFile(null)
    }
  }

  const showLoading = canFetchDeviceFiles && isLoading
  const visibleError = canFetchDeviceFiles ? error : null
  const showStatus =
    !displayDevice?.id || showLoading || !!visibleError || sortedFileList.length === 0

  const renderStatus = (): React.ReactNode => {
    if (!displayDevice?.id) {
      return <div className="text-[13px] text-muted">No device selected</div>
    }

    if (displayDevice.invalid) {
      return <div className="text-[13px] text-muted">Device unavailable</div>
    }

    if (displayDevice.status !== 'connected') {
      return <div className="text-[13px] text-muted">Device disconnected</div>
    }

    if (showLoading) {
      return <div className="text-[13px] text-muted">Loading device files…</div>
    }

    if (visibleError) {
      return <div className="text-[13px] text-muted">{visibleError}</div>
    }

    return <div className="text-[13px] text-muted">No files</div>
  }

  const renderFileList = (): React.ReactNode => (
    <div className="grid gap-2">
      {sortedFileList.map((file) => {
        const filePath = buildFilePath(fsPath, file.name)
        const isActive = selectedDeviceFilePath === filePath
        const canSetAsStartup = !file.isDirectory && isAppsPythonFile(currentPath, file.name)
        const isSettingStartup = settingStartupFile === filePath
        const isFileOperationPending = deletingFile !== null || settingStartupFile !== null
        return (
          <div
            key={file.name}
            className={`group flex h-9 items-center gap-2 rounded-lg border px-3 text-[14px] transition-colors ${
              isActive
                ? 'border-accent bg-accent-bg text-ink'
                : 'border-line bg-surface-2 text-ink hover:bg-soft'
            }`}
          >
            {file.isDirectory ? (
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
                {isImagePath(file.name) ? (
                  <ImageIcon size={14} className="shrink-0 text-muted" />
                ) : (
                  <CodeIcon size={14} className="shrink-0 text-muted" />
                )}
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left"
                  onClick={() => handlePreview(file.name)}
                >
                  {file.name}
                </button>
                {canSetAsStartup ? (
                  <Tooltip delay={300}>
                    <Tooltip.Trigger className="inline-flex shrink-0">
                      <span className="inline-flex">
                        <button
                          type="button"
                          className="inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded text-accent opacity-0 transition-all hover:bg-soft group-hover:opacity-100 focus-visible:opacity-100 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={`Set ${file.name} as startup code`}
                          disabled={isFileOperationPending}
                          onClick={() => void handleSetStartupFile(file.name)}
                        >
                          {isSettingStartup ? (
                            <RefreshIcon size={12} className="animate-spin" />
                          ) : (
                            <StartupFileIcon size={14} />
                          )}
                        </button>
                      </span>
                    </Tooltip.Trigger>
                    <Tooltip.Content placement="top" showArrow>
                      Set as startup code
                    </Tooltip.Content>
                  </Tooltip>
                ) : null}
                <button
                  type="button"
                  className="inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded text-[#ff6b6b] opacity-0 transition-all hover:bg-soft group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={`Delete ${file.name}`}
                  disabled={isFileOperationPending}
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
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3.5">
      <div className="mb-3 flex items-center gap-2 text-[12px] text-muted">
        {currentPath ? (
          <button
            type="button"
            className="inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded border border-line bg-surface-2 transition-colors hover:text-ink"
            aria-label="Go back"
            onClick={handleGoBack}
          >
            <ChevronLeftIcon size={12} />
          </button>
        ) : null}
        {rootFsPath ? (
          <span className="min-w-0 flex-1 truncate font-medium text-ink">{fsPath}</span>
        ) : (
          <span className="flex-1" />
        )}
        <button
          type="button"
          onClick={handleRefresh}
          disabled={!canFetchDeviceFiles || isLoading}
          aria-label="Refresh"
          className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-line bg-surface-2 text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RefreshIcon size={12} />
        </button>
      </div>
      {showStatus ? (
        <div className="flex flex-1 items-center justify-center text-center">{renderStatus()}</div>
      ) : (
        renderFileList()
      )}
    </div>
  )
}
