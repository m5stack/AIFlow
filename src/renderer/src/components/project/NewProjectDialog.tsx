import React, { useEffect, useState } from 'react'
import {
  Button,
  Input,
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalContainer,
  ModalDialog,
  ModalFooter,
  ModalHeader,
  ModalHeading,
  TextField
} from '@heroui/react'
import { FirmwareFlashDialog } from '../device'
import { DeviceIcon, TrashIcon, ZapIcon } from '../icons/Icons'
import { useDeviceStore } from '../../stores/deviceStore'
import { useProjectStore } from '../../stores/projectStore'
import { resolveDeviceImage } from '../../utils/device/deviceImage'
import { bindDevice } from '../../api/device'
import { removeDeviceWithConfirm } from '../../utils/device/removeDeviceWithConfirm'
import { DEFAULT_PROJECT_CODE } from '../../utils/project/defaultProjectCode'
import { toast } from '@heroui/react'

type DeviceMode = 'select' | 'pair'

interface NewProjectDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (payload: {
    projectName: string
    activeDeviceId?: string
    code: string
  }) => boolean | Promise<boolean>
}

const DeviceThumb = ({ type }: { type: string }) => (
  <div
    className="flex-shrink-0 flex items-center justify-center rounded-md overflow-hidden"
    style={{
      width: 44,
      height: 44,
      padding: 4,
      backgroundColor: 'var(--device-thumb-bg)',
      border: '1px solid var(--device-thumb-border)'
    }}
  >
    <img
      src={resolveDeviceImage(type)}
      alt={type}
      style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
    />
  </div>
)

export default function NewProjectDialog({
  isOpen,
  onClose,
  onConfirm
}: NewProjectDialogProps): React.JSX.Element | null {
  const devices = useDeviceStore((state) => state.devices)
  const unbindDevice = useDeviceStore((state) => state.unbindDevice)
  const clearActiveDeviceReferences = useProjectStore((state) => state.clearActiveDeviceReferences)
  const tempId = useDeviceStore((state) => state.tempId)
  const fetchDevices = useDeviceStore((state) => state.fetchDevices)
  const [projectName, setProjectName] = useState('')
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('select')
  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const [pairingCode, setPairingCode] = useState('')
  const [isPairing, setIsPairing] = useState(false)
  const [showFlashDialog, setShowFlashDialog] = useState(false)
  const [removingId, setRemovingId] = useState('')

  useEffect(() => {
    if (isOpen) void fetchDevices()
  }, [isOpen, fetchDevices])

  useEffect(() => {
    if (!isOpen) return
    if (devices.length === 0) {
      setSelectedDeviceId('')
      return
    }
    setSelectedDeviceId((prev) => {
      if (prev && devices.some((d) => d.id === prev)) return prev
      return devices[0].id
    })
  }, [isOpen, devices])

  const pairingCodeValid = pairingCode.length === 6 && /^\d{6}$/.test(pairingCode)
  const canConfirm =
    projectName.trim().length > 0 &&
    !isPairing &&
    (deviceMode !== 'pair' || pairingCodeValid)

  const handleRemoveDevice = async (deviceId: string, deviceName: string): Promise<void> => {
    if (removingId || isPairing) return
    setRemovingId(deviceId)
    try {
      const removed = await removeDeviceWithConfirm({
        deviceId,
        deviceName,
        unbindDevice,
        clearActiveDeviceReferences,
        onAfterRemove: () => {
          if (selectedDeviceId === deviceId) setSelectedDeviceId('')
        }
      })
      if (!removed) return
    } finally {
      setRemovingId('')
    }
  }

  const handleConfirm = async (): Promise<void> => {
    if (!canConfirm) return

    if (deviceMode === 'pair') {
      setIsPairing(true)
      try {
        const device = await bindDevice({
          name: '',
          pairCode: pairingCode,
          tempId
        })
        await fetchDevices()
        const success = await onConfirm({
          projectName: projectName.trim(),
          activeDeviceId: device.id,
          code: DEFAULT_PROJECT_CODE
        })
        if (success) handleClose()
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        toast.danger(`Add device failed: ${message}`)
      } finally {
        setIsPairing(false)
      }
      return
    }

    const success = await onConfirm({
      projectName: projectName.trim(),
      activeDeviceId: selectedDeviceId || undefined,
      code: DEFAULT_PROJECT_CODE
    })
    if (success) handleClose()
  }

  const handleClose = (): void => {
    if (isPairing) return
    setProjectName('')
    setDeviceMode('select')
    setSelectedDeviceId('')
    setPairingCode('')
    onClose()
  }

  return (
    <>
      <Modal>
        <Modal.Trigger
          aria-hidden
          tabIndex={-1}
          className="fixed size-0 overflow-hidden opacity-0 pointer-events-none border-0 p-0"
        />
        <ModalBackdrop
          isOpen={isOpen}
          onOpenChange={(open) => {
            if (!open) handleClose()
          }}
          isDismissable
        >
          <ModalContainer size="lg">
            <ModalDialog>
              <Modal.CloseTrigger />
              <ModalHeader>
                <ModalHeading className="text-lg">New Project</ModalHeading>
              </ModalHeader>

              <ModalBody className="flex flex-col gap-5 px-2">
                {/* Project Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-medium text-default-500">Project Name</label>
                  <TextField value={projectName} onChange={setProjectName}>
                    <Input
                      variant="secondary"
                      placeholder=""
                      className="text-[13px] border border-[var(--border)] rounded-lg"
                    />
                  </TextField>
                </div>

                {/* Device Section */}
                <div className="flex flex-col gap-2">
                  <label className="text-[12px] font-medium text-default-500">Device</label>
                  <p className="text-[11px] text-[var(--text)] opacity-60">
                    Optional — select a device to run code on hardware
                  </p>

                  {/* Mode toggle */}
                  <div
                    className="flex rounded-lg p-0.5 gap-0.5"
                    style={{
                      backgroundColor: 'var(--social-bg)',
                      border: '1px solid var(--border)'
                    }}
                  >
                    {(['select', 'pair'] as DeviceMode[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setDeviceMode(mode)}
                        className="flex-1 py-1.5 rounded-md text-[12px] font-medium transition-colors cursor-pointer"
                        style={{
                          backgroundColor: deviceMode === mode ? 'var(--accent)' : 'transparent',
                          color: deviceMode === mode ? '#fff' : 'var(--text)',
                          boxShadow: deviceMode === mode ? 'var(--shadow)' : 'none'
                        }}
                      >
                        {mode === 'select' ? 'Select Device' : 'Pair New Device'}
                      </button>
                    ))}
                  </div>

                  {/* Select from list */}
                  {deviceMode === 'select' && (
                    <div
                      className="flex flex-col rounded-lg overflow-hidden"
                      style={{ border: '1px solid var(--border)' }}
                    >
                      {devices.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-2">
                          <DeviceIcon size={32} className="opacity-20" />
                          <span className="text-[12px] text-center" style={{ opacity: 0.35 }}>
                            No devices paired yet. You can create the project now and pair a device
                            later.
                          </span>
                          <button
                            className="text-[12px] cursor-pointer transition-opacity hover:opacity-70"
                            style={{ color: 'var(--accent)' }}
                            onClick={() => setDeviceMode('pair')}
                          >
                            Pair a new device →
                          </button>
                        </div>
                      ) : (
                        devices.map((d) => {
                          const isSelected = selectedDeviceId === d.id
                          return (
                            <div
                              key={d.id}
                              className="flex items-center gap-3 px-3 py-2 transition-colors cursor-pointer"
                              style={{
                                borderBottom: '1px solid var(--border)',
                                backgroundColor: isSelected
                                  ? 'var(--device-card-active-bg)'
                                  : 'var(--device-card-bg)'
                              }}
                              onClick={() => setSelectedDeviceId(isSelected ? '' : d.id)}
                            >
                              <div
                                style={{
                                  width: 16,
                                  height: 16,
                                  borderRadius: '50%',
                                  border: isSelected
                                    ? '5px solid var(--accent)'
                                    : '2px solid var(--border)',
                                  backgroundColor: 'transparent',
                                  flexShrink: 0
                                }}
                              />
                              <DeviceThumb type={d.type} />
                              <div className="flex-1 min-w-0">
                                <div className="text-[13px] font-medium text-[var(--text-h)] truncate">
                                  {d.name || d.type}
                                </div>
                                <div className="text-[11px] text-[var(--text)] opacity-60 truncate">
                                  {d.type}
                                </div>
                              </div>
                              <button
                                className="flex-shrink-0 flex items-center justify-center rounded opacity-40 hover:opacity-100 transition-opacity cursor-pointer"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  padding: 4,
                                  color: '#f85149'
                                }}
                                disabled={!!removingId || isPairing}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  void handleRemoveDevice(d.id, d.name || d.type)
                                }}
                                title="Remove device"
                              >
                                <TrashIcon size={14} />
                              </button>
                            </div>
                          )
                        })
                      )}
                    </div>
                  )}

                  {/* Pair by code */}
                  {deviceMode === 'pair' && (
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[12px] font-medium text-default-500">
                          Pair Code
                        </label>
                        <p className="text-[11px]" style={{ color: 'var(--text)', opacity: 0.6 }}>
                          Enter the 6-digit pairing code shown on the device screen.
                        </p>
                        <TextField
                          value={pairingCode}
                          onChange={(v) => setPairingCode(v.replace(/\D/g, '').slice(0, 6))}
                        >
                          <Input
                            placeholder="000000"
                            className="min-h-14 border border-[var(--border)] rounded-lg"
                            style={{
                              fontSize: 28,
                              lineHeight: 1,
                              letterSpacing: '0.35em',
                              textAlign: 'center',
                              fontFamily: 'ui-monospace, monospace',
                              paddingTop: 12,
                              paddingBottom: 12
                            }}
                            maxLength={6}
                            disabled={isPairing}
                          />
                        </TextField>
                        {pairingCode.length > 0 && !pairingCodeValid && (
                          <p className="text-[11px]" style={{ color: '#f85149' }}>
                            Pairing code must be exactly 6 digits.
                          </p>
                        )}
                      </div>

                      {/* Firmware flash */}
                      <div
                        className="flex items-center justify-between rounded-lg px-3 py-2.5"
                        style={{
                          backgroundColor: 'var(--social-bg)',
                          border: '1px solid var(--border)'
                        }}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[12px] font-medium text-[var(--text-h)]">
                            Flash Firmware
                          </span>
                          <span
                            className="text-[11px]"
                            style={{ color: 'var(--text)', opacity: 0.55 }}
                          >
                            Install UIFlow firmware on a new device
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          className="text-[12px] cursor-pointer flex-shrink-0"
                          onClick={() => setShowFlashDialog(true)}
                        >
                          <ZapIcon size={13} className="mr-1" />
                          Flash
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </ModalBody>

              <ModalFooter className="flex justify-end gap-2 px-2">
                <Button
                  variant="ghost"
                  className="text-[13px] cursor-pointer"
                  onClick={handleClose}
                  isDisabled={isPairing}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  className="text-[13px] cursor-pointer"
                  isDisabled={!canConfirm}
                  onClick={() => {
                    void handleConfirm()
                  }}
                >
                  {isPairing ? 'Pairing...' : 'Create Project'}
                </Button>
              </ModalFooter>
            </ModalDialog>
          </ModalContainer>
        </ModalBackdrop>
      </Modal>

      <FirmwareFlashDialog isOpen={showFlashDialog} onClose={() => setShowFlashDialog(false)} />
    </>
  )
}
