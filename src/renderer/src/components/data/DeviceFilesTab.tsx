import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from '@heroui/react'
import { deleteDeviceFile, getDeviceFileTree } from '../../api/device'
import type { DeviceFile, DeviceFileTreeNode } from '../../types/device'
import { useActiveProjectDevices } from '../../hooks/useActiveProjectDevices'
import { useClientIdStore } from '../../stores/clientIdStore'
import { useDeviceFilePreviewStore } from '../../stores/deviceFilePreviewStore'
import { useDeviceFileTreeStore } from '../../stores/deviceFileTreeStore'
import { useDeviceStore } from '../../stores/deviceStore'
import { isImagePath } from '../../../../shared/fileExtensions'
import {
  ChevronLeftIcon,
  CodeIcon,
  FolderIcon,
  ImageIcon,
  RefreshIcon,
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
  const clientId = useClientIdStore((s) => s.clientId)
  const { selectedDevice } = useActiveProjectDevices()
  const allDevices = useDeviceStore((s) => s.devices)
  const loadPreview = useDeviceFilePreviewStore((s) => s.loadPreview)
  const clearPreview = useDeviceFilePreviewStore((s) => s.clearPreview)
  const selectedDeviceFilePath = useDeviceFilePreviewStore((s) => s.selectedFile?.path ?? null)
  const storeDeviceId = useDeviceFileTreeStore((s) => s.deviceId)
  const storeTree = useDeviceFileTreeStore((s) => s.tree)
  const storeRootFsPath = useDeviceFileTreeStore((s) => s.rootFsPath)
  const setDeviceFileTree = useDeviceFileTreeStore((s) => s.setTree)
  const clearDeviceFileTree = useDeviceFileTreeStore((s) => s.clear)
  const confirm = useConfirmDialog()

  const displayDevice = useMemo(() => {
    if (selectedDevice && !selectedDevice.invalid) return selectedDevice
    return allDevices.find((device) => !device.invalid) ?? allDevices[0]
  }, [selectedDevice, allDevices])

  const [currentPath, setCurrentPath] = useState(ROOT_PATH)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const [deletingFile, setDeletingFile] = useState<string | null>(null)

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
    setCurrentPath(ROOT_PATH)
    clearPreview()
    clearDeviceFileTree()
  }, [clearDeviceFileTree, clearPreview, displayDevice?.id])

  useEffect(() => {
    clearPreview()
  }, [clearPreview, currentPath])

  const fetchFiles = useCallback(async () => {
    if (!displayDevice?.id) {
      clearDeviceFileTree()
      setError(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const response = await getDeviceFileTree({
        deviceId: displayDevice.id,
        clientId
      })
      setDeviceFileTree(displayDevice.id, response.tree ?? {}, response.fs_path ?? '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load device files')
      clearDeviceFileTree()
    } finally {
      setIsLoading(false)
    }
  }, [clearDeviceFileTree, clientId, displayDevice?.id, setDeviceFileTree])

  useEffect(() => {
    void fetchFiles()
  }, [fetchFiles, refreshTick])

  const handleOpenFolder = (name: string): void => {
    const nextPath = currentPath ? `${currentPath}/${name}` : name
    setCurrentPath(nextPath)
  }

  const handleGoBack = (): void => {
    setCurrentPath(parentPath(currentPath) || ROOT_PATH)
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
      handleRefresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      toast.danger(`Delete device file failed: ${message}`)
    } finally {
      setDeletingFile(null)
    }
  }

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
          disabled={!displayDevice?.id || isLoading}
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
