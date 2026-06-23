import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Checkbox, Tooltip, toast } from '@heroui/react'
import { useDeviceStore } from '../../../stores/deviceStore'
import { useProjectStore } from '../../../stores/projectStore'
import { useActiveProjectDevices } from '../../../hooks/useActiveProjectDevices'
import { resolveDeviceImage, imgUnknown } from '../../../utils/device/deviceImage'
import { runProjectOnDevice } from '../../../utils/device/runProjectOnDevice'
import { removeDeviceWithConfirm } from '../../../utils/device/removeDeviceWithConfirm'
import AddDeviceDialog from '../../device/AddDeviceDialog'
import DeviceListDialog from '../../device/DeviceListDialog'
import FirmwareFlashDialog from '../../device/FirmwareFlashDialog'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EditIcon,
  ListIcon,
  PlayIcon,
  PlusIcon,
  TrashIcon,
  ZapIcon
} from '../../icons/Icons'

export default function FlowDevice(): React.JSX.Element {
  const allDevices = useDeviceStore((s) => s.devices)
  const tempId = useDeviceStore((s) => s.tempId)
  const fetchDevices = useDeviceStore((s) => s.fetchDevices)
  const unbindDevice = useDeviceStore((s) => s.unbindDevice)
  const renameDevice = useDeviceStore((s) => s.renameDevice)

  const setProjectActiveDevice = useProjectStore((s) => s.setProjectActiveDevice)
  const clearActiveDeviceReferences = useProjectStore((s) => s.clearActiveDeviceReferences)
  const codeFilePath = useProjectStore((s) => s.codeFilePath)
  const selectedFileContent = useProjectStore((s) => s.selectedFileContent)
  const autoRunAfterChatEnabled = useProjectStore((s) => s.autoRunAfterChatEnabled)
  const setAutoRunAfterChatEnabled = useProjectStore((s) => s.setAutoRunAfterChatEnabled)

  const { activeProjectId, activeProject, selectedDevice } = useActiveProjectDevices()

  const [showDeviceList, setShowDeviceList] = useState(false)
  const [showAddDeviceDialog, setShowAddDeviceDialog] = useState(false)
  const [showFlashDialog, setShowFlashDialog] = useState(false)
  const [previewDeviceId, setPreviewDeviceId] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editingName, setEditingName] = useState('')
  const [isRenaming, setIsRenaming] = useState(false)
  const renameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void fetchDevices()
  }, [fetchDevices])

  useEffect(() => {
    if (!activeProjectId || allDevices.length === 0) return
    const currentId = activeProject?.activeDeviceId
    if (currentId && !allDevices.some((d) => d.id === currentId)) {
      void setProjectActiveDevice(activeProjectId, allDevices[0].id)
    }
  }, [activeProjectId, activeProject?.activeDeviceId, allDevices, setProjectActiveDevice])

  useEffect(() => {
    if (activeProjectId) return
    if (allDevices.length === 0) {
      setPreviewDeviceId('')
      return
    }
    if (!previewDeviceId || !allDevices.some((d) => d.id === previewDeviceId)) {
      setPreviewDeviceId(allDevices[0].id)
    }
  }, [activeProjectId, allDevices, previewDeviceId])

  const displayDevice = useMemo(() => {
    if (activeProjectId) return selectedDevice
    if (allDevices.length === 0) return undefined
    const matched = previewDeviceId ? allDevices.find((d) => d.id === previewDeviceId) : undefined
    return matched ?? allDevices[0]
  }, [activeProjectId, selectedDevice, allDevices, previewDeviceId])

  const canCycle = allDevices.length >= 2
  const hasDevice = !!displayDevice
  const canRemove =
    !!displayDevice?.id &&
    allDevices.some((d) => d.id === displayDevice.id) &&
    !displayDevice.invalid &&
    !isRemoving
  const poolDevice = allDevices.find((d) => d.id === displayDevice?.id)
  const canRun = !!activeProjectId && !!selectedDevice?.id && !selectedDevice.invalid && !isRunning
  const canRename =
    hasDevice && !!displayDevice?.id && !displayDevice.invalid && !!poolDevice && !isRenaming

  const cycleDevice = (delta: -1 | 1): void => {
    if (!canCycle) return
    const idx = allDevices.findIndex((d) => d.id === displayDevice?.id)
    const base = idx >= 0 ? idx : 0
    const next = allDevices[(base + delta + allDevices.length) % allDevices.length]
    if (activeProjectId) {
      void setProjectActiveDevice(activeProjectId, next.id)
    } else {
      setPreviewDeviceId(next.id)
    }
  }

  const deviceImage = hasDevice ? resolveDeviceImage(displayDevice.type) : imgUnknown
  const deviceName = !displayDevice ? 'No device' : displayDevice.name || displayDevice.type
  const deviceType = hasDevice ? displayDevice.type : ''

  const isConnected = poolDevice?.status === 'connected' && !displayDevice?.invalid
  const statusLabel = !displayDevice
    ? 'No device paired'
    : isConnected
      ? 'Connected'
      : displayDevice.invalid
        ? 'Invalid'
        : 'Disconnected'

  const clearNameEditing = (): void => {
    setIsEditingName(false)
    setEditingName('')
  }

  const startRename = (): void => {
    if (!canRename || !displayDevice) return
    setIsEditingName(true)
    setEditingName(displayDevice.name || displayDevice.type)
    requestAnimationFrame(() => {
      renameInputRef.current?.focus()
      renameInputRef.current?.select()
    })
  }

  const submitRename = async (): Promise<void> => {
    if (!displayDevice?.id || isRenaming) return
    const currentName = displayDevice.name || displayDevice.type
    const nextName = editingName.trim()
    clearNameEditing()
    if (!nextName || nextName === currentName) return

    setIsRenaming(true)
    try {
      await renameDevice(displayDevice.id, nextName)
      toast.success('Device renamed.')
    } catch (error) {
      toast.danger(`Rename failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsRenaming(false)
    }
  }

  const handleRemoveDevice = async (): Promise<void> => {
    if (!displayDevice?.id || isRemoving) return
    const deviceId = displayDevice.id
    const currentIndex = allDevices.findIndex((d) => d.id === deviceId)
    const remaining = allDevices.filter((d) => d.id !== deviceId)

    setIsRemoving(true)
    try {
      const removed = await removeDeviceWithConfirm({
        deviceId,
        deviceName: displayDevice.name || displayDevice.type,
        unbindDevice,
        clearActiveDeviceReferences,
        onAfterRemove: () => {
          if (remaining.length === 0) return
          const nextIndex =
            currentIndex >= 0 && currentIndex < remaining.length
              ? currentIndex
              : remaining.length - 1
          if (activeProjectId) {
            void setProjectActiveDevice(activeProjectId, remaining[nextIndex].id)
          } else {
            setPreviewDeviceId(remaining[nextIndex].id)
          }
        }
      })
      if (!removed) return
    } finally {
      setIsRemoving(false)
    }
  }

  const runOnDevice = async (includeMainPyInDownload: boolean): Promise<void> => {
    if (!activeProjectId) {
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

    const selectedPath = codeFilePath ?? undefined
    setIsRunning(true)
    try {
      const { ran } = await runProjectOnDevice({
        projectId: activeProjectId,
        deviceId: selectedDevice.id,
        tempId,
        fileNodes: activeProject?.files ?? [],
        selectedPath,
        selectedContent: selectedFileContent,
        includeMainPyInDownload
      })
      if (!ran) {
        toast.danger('No code to run. Add main.py content first.')
        return
      }
      toast.success(
        includeMainPyInDownload ? 'Files downloaded and code sent.' : 'Code sent to device.'
      )
    } catch (error) {
      toast.danger(`Run failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <>
      <div className="flow-device-wrap">
        <div className="flow-device">
          <div className="flow-device-left">
            <span className="flow-device-title">Device</span>
            <div className="flow-device-left-actions">
              <Tooltip delay={300}>
                <Tooltip.Trigger className="inline-flex">
                  <span className="inline-flex">
                    <button
                      type="button"
                      className="flow-device-action"
                      aria-label="Add device"
                      onClick={() => setShowAddDeviceDialog(true)}
                    >
                      <PlusIcon size={12} />
                    </button>
                  </span>
                </Tooltip.Trigger>
                <Tooltip.Content placement="top" showArrow>
                  Add device
                </Tooltip.Content>
              </Tooltip>
              <Tooltip delay={300}>
                <Tooltip.Trigger className="inline-flex">
                  <span className="inline-flex">
                    <button
                      type="button"
                      className="flow-device-action"
                      aria-label="Device list"
                      onClick={() => setShowDeviceList(true)}
                    >
                      <ListIcon size={12} />
                    </button>
                  </span>
                </Tooltip.Trigger>
                <Tooltip.Content placement="top" showArrow>
                  All Devices
                </Tooltip.Content>
              </Tooltip>
            </div>
          </div>

          <div className="flow-device-center">
            <button
              type="button"
              className="flow-device-nav"
              aria-label="Previous device"
              disabled={!canCycle}
              onClick={() => cycleDevice(-1)}
            >
              <ChevronLeftIcon size={20} />
            </button>

            <div className="flow-device-info">
              <div className="flow-device-thumb">
                <img src={deviceImage} alt="" />
                <Tooltip delay={300}>
                  <Tooltip.Trigger className="inline-flex">
                    <span
                      className="flow-device-status-dot"
                      title={statusLabel}
                      style={{
                        backgroundColor: isConnected
                          ? 'var(--status-connected)'
                          : 'var(--status-disconnected)'
                      }}
                    />
                  </Tooltip.Trigger>
                  <Tooltip.Content placement="top" showArrow>
                    {statusLabel}
                  </Tooltip.Content>
                </Tooltip>
                {canRemove ? (
                  <Tooltip delay={300}>
                    <Tooltip.Trigger className="flow-device-remove-anchor">
                      <button
                        type="button"
                        className="flow-device-remove"
                        aria-label="Remove device"
                        onClick={() => {
                          void handleRemoveDevice()
                        }}
                      >
                        <TrashIcon size={8} />
                      </button>
                    </Tooltip.Trigger>
                    <Tooltip.Content placement="top" showArrow>
                      Remove device
                    </Tooltip.Content>
                  </Tooltip>
                ) : null}
              </div>
              <div className="flow-device-text">
                <span className="flow-device-name">
                  {isEditingName ? (
                    <input
                      ref={renameInputRef}
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          void submitRename()
                        }
                        if (e.key === 'Escape') {
                          e.preventDefault()
                          clearNameEditing()
                        }
                      }}
                      onBlur={() => void submitRename()}
                      className="app-input flow-device-name-input"
                    />
                  ) : (
                    <>
                      <span className="flow-device-name-label">{deviceName}</span>
                      {displayDevice?.invalid && (
                        <span className="flow-device-invalid">Invalid</span>
                      )}
                      {canRename ? (
                        <button
                          type="button"
                          className="flow-device-name-edit"
                          aria-label="Rename device"
                          title="Rename device"
                          onClick={startRename}
                        >
                          <EditIcon size={10} />
                        </button>
                      ) : null}
                    </>
                  )}
                </span>
                {deviceType ? <span className="flow-device-type">{deviceType}</span> : null}
              </div>
            </div>

            <button
              type="button"
              className="flow-device-nav"
              aria-label="Next device"
              disabled={!canCycle}
              onClick={() => cycleDevice(1)}
            >
              <ChevronRightIcon size={20} />
            </button>
          </div>
        </div>

        <div className="flow-device-side">
          <Button
            size="sm"
            className="flow-device-run flow-device-run-download"
            isDisabled={!canRun}
            onPress={() => void runOnDevice(true)}
          >
            {isRunning ? 'Running…' : 'Run & Download'}
          </Button>
          <Button
            size="sm"
            variant="primary"
            className="flow-device-run flow-device-run-send"
            isDisabled={!canRun}
            onPress={() => void runOnDevice(false)}
          >
            <PlayIcon size={12} />
            {isRunning ? 'Running…' : 'Run'}
          </Button>
          <Button
            size="sm"
            className="flow-device-run flow-device-run-flash"
            onPress={() => setShowFlashDialog(true)}
          >
            <ZapIcon size={12} />
            Firmware
          </Button>
          <Button
            size="sm"
            variant={autoRunAfterChatEnabled ? 'primary' : undefined}
            className={`flow-device-run flow-device-run-auto${autoRunAfterChatEnabled ? ' is-active' : ''}`}
            aria-pressed={autoRunAfterChatEnabled}
            aria-label="Auto-Run after chat"
            onPress={() => setAutoRunAfterChatEnabled(!autoRunAfterChatEnabled)}
          >
            <span className="flow-device-auto-run-visual" aria-hidden>
              <Checkbox
                isSelected={autoRunAfterChatEnabled}
                isReadOnly
                className="flow-device-auto-run-checkbox"
              >
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
              </Checkbox>
            </span>
            Auto-Run
          </Button>
        </div>
      </div>

      <DeviceListDialog
        isOpen={showDeviceList}
        projectId={activeProjectId}
        previewDeviceId={previewDeviceId}
        onPreviewDevice={setPreviewDeviceId}
        onAdd={() => {
          setShowDeviceList(false)
          setShowAddDeviceDialog(true)
        }}
        onClose={() => setShowDeviceList(false)}
      />
      <AddDeviceDialog
        isOpen={showAddDeviceDialog}
        onClose={() => setShowAddDeviceDialog(false)}
        projectId={activeProjectId}
        onDeviceAdded={(deviceId) => {
          if (!activeProjectId) setPreviewDeviceId(deviceId)
        }}
      />
      <FirmwareFlashDialog isOpen={showFlashDialog} onClose={() => setShowFlashDialog(false)} />
    </>
  )
}
