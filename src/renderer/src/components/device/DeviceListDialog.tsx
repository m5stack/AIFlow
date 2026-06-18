import React, { useEffect, useRef, useState } from 'react'
import {
  Button,
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalContainer,
  ModalDialog,
  ModalFooter,
  ModalHeader,
  ModalHeading,
  toast
} from '@heroui/react'
import type { DeviceItem } from '../../types/device'
import { resolveDeviceImage } from '../../utils/device/deviceImage'
import { useDeviceStore } from '../../stores/deviceStore'
import { useProjectStore } from '../../stores/projectStore'
import { removeDeviceWithConfirm } from '../../utils/device/removeDeviceWithConfirm'
import { DeviceIcon, EditIcon, TrashIcon, PlusIcon } from '../icons/Icons'

interface DeviceListDialogProps {
  isOpen: boolean
  projectId: string | undefined
  previewDeviceId?: string
  onPreviewDevice?: (deviceId: string) => void
  onAdd: () => void
  onClose: () => void
}

const DeviceThumb = ({ type, status }: { type: string; status: DeviceItem['status'] }) => {
  const isConnected = status === 'connected'
  const statusLabel = isConnected ? 'Connected' : 'Disconnected'

  return (
    <div
      className="relative flex-shrink-0 flex items-center justify-center rounded-xl overflow-visible"
      style={{
        width: 56,
        height: 56,
        padding: 6,
        backgroundColor: 'var(--device-thumb-bg)',
        border: '1px solid var(--device-thumb-border)'
      }}
    >
      <span
        className="absolute left-0 top-0 size-[9px] rounded-full box-border pointer-events-none"
        style={{
          border: '1.5px solid var(--device-thumb-bg)',
          backgroundColor: isConnected
            ? 'var(--status-connected)'
            : 'var(--status-disconnected)'
        }}
        title={statusLabel}
        aria-label={statusLabel}
      />
      <div className="size-full overflow-hidden rounded-lg">
        <img
          src={resolveDeviceImage(type)}
          alt={type}
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        />
      </div>
    </div>
  )
}

export default function DeviceListDialog({
  isOpen,
  projectId,
  previewDeviceId,
  onPreviewDevice,
  onAdd,
  onClose
}: DeviceListDialogProps): React.JSX.Element {
  const allDevices = useDeviceStore((state) => state.devices)
  const fetchDevices = useDeviceStore((state) => state.fetchDevices)
  const unbindDevice = useDeviceStore((state) => state.unbindDevice)
  const renameDevice = useDeviceStore((state) => state.renameDevice)
  const projects = useProjectStore((state) => state.projects)
  const setProjectActiveDevice = useProjectStore((state) => state.setProjectActiveDevice)
  const clearActiveDeviceReferences = useProjectStore((state) => state.clearActiveDeviceReferences)
  const [removingId, setRemovingId] = useState('')
  const [editingDeviceId, setEditingDeviceId] = useState('')
  const [editingName, setEditingName] = useState('')
  const [isRenaming, setIsRenaming] = useState(false)
  const renameInputRef = useRef<HTMLInputElement>(null)

  const project = projects.find((p) => p.id === projectId)
  const activeDeviceId = projectId ? (project?.activeDeviceId ?? '') : (previewDeviceId ?? '')

  useEffect(() => {
    if (isOpen) void fetchDevices()
  }, [isOpen, fetchDevices])

  const handleRemoveGlobal = async (deviceId: string, deviceName: string): Promise<void> => {
    if (removingId || editingDeviceId) return
    setRemovingId(deviceId)
    try {
      await removeDeviceWithConfirm({
        deviceId,
        deviceName,
        unbindDevice,
        clearActiveDeviceReferences
      })
    } finally {
      setRemovingId('')
    }
  }

  const clearNameEditing = (): void => {
    setEditingDeviceId('')
    setEditingName('')
  }

  const startRename = (deviceId: string, currentName: string): void => {
    if (isRenaming) return
    setEditingDeviceId(deviceId)
    setEditingName(currentName)
    requestAnimationFrame(() => {
      renameInputRef.current?.focus()
      renameInputRef.current?.select()
    })
  }

  const submitRename = async (deviceId: string, currentName: string): Promise<void> => {
    if (isRenaming) return
    const nextName = editingName.trim()
    clearNameEditing()
    if (!nextName || nextName === currentName) return

    setIsRenaming(true)
    try {
      await renameDevice(deviceId, nextName)
      toast.success('Device renamed.')
    } catch (error) {
      toast.danger(`Rename failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsRenaming(false)
    }
  }

  const stopCardAction = (event: React.SyntheticEvent): void => {
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <Modal>
      <Modal.Trigger
        aria-hidden
        tabIndex={-1}
        className="fixed size-0 overflow-hidden opacity-0 pointer-events-none border-0 p-0"
      />
      <ModalBackdrop
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose()
        }}
        isDismissable
      >
        <ModalContainer size="lg">
          <ModalDialog style={{ width: 760, maxWidth: '94vw' }}>
            <Modal.CloseTrigger />
            <ModalHeader>
              <ModalHeading className="text-lg">All Devices</ModalHeading>
            </ModalHeader>

            <ModalBody className="p-3">
              {allDevices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <DeviceIcon size={36} className="opacity-20" />
                  <span className="text-[12px]" style={{ opacity: 0.4 }}>
                    No devices paired yet
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {allDevices.map((d) => {
                    const isActive = d.id === activeDeviceId
                    const displayName = d.name || d.type
                    const isEditing = editingDeviceId === d.id
                    return (
                      <div
                        key={d.id}
                        className="flex items-center gap-3 p-3 rounded-2xl transition-all relative group text-left"
                        style={{
                          border: isActive
                            ? '1.5px solid var(--device-card-active-border)'
                            : '1px solid var(--border)',
                          backgroundColor: isActive
                            ? 'var(--device-card-active-bg)'
                            : 'var(--device-card-bg)',
                          boxShadow: isActive ? 'var(--device-card-active-shadow)' : 'none'
                        }}
                      >
                        <button
                          type="button"
                          className="absolute top-2.5 right-2.5 w-5 h-5 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                          style={{ backgroundColor: '#f85149', color: '#fff', border: 'none' }}
                          title="Remove device"
                          disabled={!!removingId || !!editingDeviceId || isRenaming}
                          onClick={() => {
                            void handleRemoveGlobal(d.id, displayName)
                          }}
                        >
                          <TrashIcon size={12} />
                        </button>

                        <button
                          type="button"
                          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                          style={{ background: 'none', border: 'none', padding: 0 }}
                          disabled={isEditing}
                          onClick={() => {
                            if (isEditing) return
                            if (projectId) {
                              void setProjectActiveDevice(projectId, d.id)
                              return
                            }
                            onPreviewDevice?.(d.id)
                          }}
                        >
                          <DeviceThumb type={d.type} status={d.status} />
                          <div className="min-w-0 flex-1 pr-5">
                            {isEditing ? (
                              <input
                                ref={renameInputRef}
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onKeyDown={(e) => {
                                  e.stopPropagation()
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    void submitRename(d.id, displayName)
                                  }
                                  if (e.key === 'Escape') {
                                    e.preventDefault()
                                    clearNameEditing()
                                  }
                                }}
                                onBlur={() => void submitRename(d.id, displayName)}
                                onMouseDown={stopCardAction}
                                onPointerDown={stopCardAction}
                                onClick={stopCardAction}
                                className="app-input min-w-0 w-full text-[13px] text-center leading-none font-semibold mb-1.5"
                              />
                            ) : (
                              <div className="mb-1.5">
                                <div className="relative inline-flex min-w-0 max-w-full">
                                  <span className="min-w-0 truncate text-[13px] leading-none font-semibold text-[var(--text-h)]">
                                    {displayName}
                                  </span>
                                  <button
                                    type="button"
                                    className="absolute left-full top-1/2 -translate-y-1/2 ml-0.5 inline-flex items-center justify-center size-[13px] rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer pointer-events-none group-hover:pointer-events-auto"
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: 'var(--text-muted, rgba(0,0,0,0.45))'
                                    }}
                                    title="Rename device"
                                    aria-label="Rename device"
                                    disabled={!!removingId || isRenaming}
                                    onMouseDown={stopCardAction}
                                    onPointerDown={stopCardAction}
                                    onClick={(event) => {
                                      stopCardAction(event)
                                      startRename(d.id, displayName)
                                    }}
                                  >
                                    <EditIcon size={9} />
                                  </button>
                                </div>
                              </div>
                            )}
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                              style={{
                                backgroundColor: 'var(--accent-bg)',
                                color: 'var(--accent)'
                              }}
                            >
                              {d.type}
                            </span>
                          </div>
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </ModalBody>

            <ModalFooter className="flex justify-between px-2">
              <Button
                variant="outline"
                className="text-[13px] gap-1.5 cursor-pointer"
                onClick={() => {
                  onClose()
                  onAdd()
                }}
              >
                <PlusIcon size={12} />
                Pair Device
              </Button>
              <Button variant="ghost" className="text-[13px] cursor-pointer" onClick={onClose}>
                Close
              </Button>
            </ModalFooter>
          </ModalDialog>
        </ModalContainer>
      </ModalBackdrop>
    </Modal>
  )
}
