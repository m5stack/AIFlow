import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Checkbox, Tooltip, toast } from '@heroui/react'
import { useDeviceStore } from '../../../stores/deviceStore'
import { useProjectStore } from '../../../stores/projectStore'
import { useFlowStatusStore } from '../../../stores/flowStatusStore'
import { useClientIdStore } from '../../../stores/clientIdStore'
import { useActiveProjectDevices } from '../../../hooks/useActiveProjectDevices'
import { imgUnknown } from '../../../utils/device/deviceImage'
import { removeDeviceWithConfirm } from '../../../utils/device/removeDeviceWithConfirm'
import { sendProjectToDevice } from '../../../utils/device/projectDeviceTransfer'
import AddDeviceDialog from '../../device/AddDeviceDialog'
import DeviceCardContent from '../../device/DeviceCardContent'
import DeviceListDialog from '../../device/DeviceListDialog'
import FirmwareFlashDialog from '../../device/FirmwareFlashDialog'
import { useConfirmDialog } from '../../common/confirmDialogContext'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EditIcon,
  ListIcon,
  PlusIcon,
  SendIcon,
  TrashIcon,
  ZapIcon
} from '../../icons/Icons'

export default function FlowDevice(): React.JSX.Element {
  const confirm = useConfirmDialog()
  const clientId = useClientIdStore((s) => s.clientId)
  const allDevices = useDeviceStore((s) => s.devices)
  const unbindDevice = useDeviceStore((s) => s.unbindDevice)
  const renameDevice = useDeviceStore((s) => s.renameDevice)

  const setProjectActiveDevice = useProjectStore((s) => s.setProjectActiveDevice)
  const clearActiveDeviceReferences = useProjectStore((s) => s.clearActiveDeviceReferences)
  const autoRunAfterChatEnabled = useProjectStore((s) => s.autoRunAfterChatEnabled)
  const setAutoRunAfterChatEnabled = useProjectStore((s) => s.setAutoRunAfterChatEnabled)
  const codeFilePath = useProjectStore((s) => s.codeFilePath)
  const selectedFileContent = useProjectStore((s) => s.selectedFileContent)
  const deviceGlow = useFlowStatusStore((s) => s.device)
  const setDeviceGlow = useFlowStatusStore((s) => s.setDevice)
  const talk = useFlowStatusStore((s) => s.talk)
  const showGlow = !talk && deviceGlow !== 'idle'

  const { activeProjectId, activeProject, selectedDevice } = useActiveProjectDevices()

  const [showDeviceList, setShowDeviceList] = useState(false)
  const [showAddDeviceDialog, setShowAddDeviceDialog] = useState(false)
  const [showFlashDialog, setShowFlashDialog] = useState(false)
  const [previewDeviceId, setPreviewDeviceId] = useState('')
  const [isRemoving, setIsRemoving] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editingName, setEditingName] = useState('')
  const [isRenaming, setIsRenaming] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const renameInputRef = useRef<HTMLInputElement>(null)

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
    !!displayDevice?.id && allDevices.some((d) => d.id === displayDevice.id) && !isRemoving
  const poolDevice = allDevices.find((d) => d.id === displayDevice?.id)
  const canRename =
    hasDevice && !!displayDevice?.id && !displayDevice.invalid && !!poolDevice && !isRenaming
  const canSend =
    !!activeProjectId &&
    !!activeProject &&
    !!selectedDevice?.id &&
    !selectedDevice.invalid &&
    !isSending

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

  const deviceName = !displayDevice ? 'No device' : displayDevice.name || displayDevice.type

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
        confirm,
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

  const handleSendToDevice = async (): Promise<void> => {
    if (
      !activeProjectId ||
      !activeProject ||
      !selectedDevice?.id ||
      selectedDevice.invalid ||
      isSending
    ) {
      return
    }

    setIsSending(true)
    setDeviceGlow('running')
    try {
      const { sent } = await sendProjectToDevice({
        projectId: activeProjectId,
        projectName: activeProject.projectName,
        deviceId: selectedDevice.id,
        clientId,
        selectedPath: codeFilePath ?? undefined,
        selectedContent: selectedFileContent
      })
      if (!sent) {
        setDeviceGlow('idle')
        toast.danger('No code to send. Add main.py content first.')
        return
      }
      setDeviceGlow('success')
      toast.success('Project sent to device.')
    } catch (error) {
      setDeviceGlow('failed')
      toast.danger(`Send failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <>
      <div className="flow-device-wrap">
        <div
          className={`flow-device${showGlow && deviceGlow === 'running'
            ? ' flow-device-running'
            : showGlow && deviceGlow === 'success'
              ? ' flow-device-success'
              : showGlow && deviceGlow === 'failed'
                ? ' flow-device-failed'
                : ''
            }`}
        >
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
              {displayDevice ? (
                <DeviceCardContent
                  device={displayDevice}
                  compact
                  thumbnailClassName="flow-device-thumb"
                  thumbnailOverlay={
                    canRemove ? (
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
                    ) : null
                  }
                  nameContent={
                    <span className={`flow-device-name${isEditingName ? ' is-editing' : ''}`}>
                      <span className="flow-device-name-label">{deviceName}</span>
                      {canRename ? (
                        <button
                          type="button"
                          className="flow-device-name-edit"
                          aria-label="Rename device"
                          title="Rename device"
                          onClick={startRename}
                        >
                          <EditIcon size={9} />
                        </button>
                      ) : null}
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
                      ) : null}
                    </span>
                  }
                />
              ) : (
                <div className="flow-device-empty">
                  <div className="flow-device-empty-thumb">
                    <img src={imgUnknown} alt="" />
                  </div>
                  <div className="flow-device-empty-text">
                    <span className="flow-device-name-label">No device</span>
                    <span>No device paired</span>
                  </div>
                </div>
              )}
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
            className="flow-device-run flow-device-run-device"
            isDisabled={!canSend}
            onPress={() => void handleSendToDevice()}
          >
            <SendIcon size={12} />
            {isSending ? 'Sending…' : 'Send local files to device'}
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
