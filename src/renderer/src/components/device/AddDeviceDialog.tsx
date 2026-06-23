import React, { useMemo, useState } from 'react'
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
  TextField,
  toast
} from '@heroui/react'
import { bindDevice } from '../../api/device'
import { useDeviceStore } from '../../stores/deviceStore'
import { useProjectStore } from '../../stores/projectStore'

interface AddDeviceDialogProps {
  isOpen: boolean
  projectId?: string
  onClose: () => void
  onDeviceAdded?: (deviceId: string) => void
}

export default function AddDeviceDialog({
  isOpen,
  projectId,
  onClose,
  onDeviceAdded
}: AddDeviceDialogProps): React.JSX.Element | null {
  const tempId = useDeviceStore((state) => state.tempId)
  const fetchDevices = useDeviceStore((state) => state.fetchDevices)
  const setProjectActiveDevice = useProjectStore((state) => state.setProjectActiveDevice)

  const [pairCode, setPairCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const pairCodeValid = pairCode.length === 6 && /^\d{6}$/.test(pairCode)

  const canSubmit = useMemo(() => {
    return pairCodeValid && !isSubmitting
  }, [pairCodeValid, isSubmitting])

  const handleClose = (): void => {
    if (isSubmitting) return
    setPairCode('')
    onClose()
  }

  const handleSubmit = async (): Promise<void> => {
    if (!canSubmit) return
    const safePairCode = pairCode

    setIsSubmitting(true)
    try {
      const device = await bindDevice({
        name: '',
        pairCode: safePairCode,
        tempId
      })

      await fetchDevices()
      const latest = useDeviceStore.getState().devices.find((d) => d.id === device.id) ?? device
      if (projectId) void setProjectActiveDevice(projectId, latest.id)
      onDeviceAdded?.(latest.id)
      toast.success(`Device \"${latest.name}\" added.`)
      handleClose()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      toast.danger(`Add device failed: ${message}`)
    } finally {
      setIsSubmitting(false)
    }
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
          if (!open) handleClose()
        }}
        isDismissable={!isSubmitting}
      >
        <ModalContainer size="lg">
          <ModalDialog>
            <Modal.CloseTrigger />
            <ModalHeader>
              <ModalHeading className="text-lg">Add Device</ModalHeading>
            </ModalHeader>

            <ModalBody className="flex flex-col gap-4 p-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-default-500">Access Code</label>
                <p className="text-[11px]" style={{ color: 'var(--text)', opacity: 0.6 }}>
                  Enter the 6-digit pairing code shown on the device screen.
                </p>
                <TextField
                  value={pairCode}
                  onChange={(v) => setPairCode(v.replace(/\D/g, '').slice(0, 6))}
                >
                  <Input
                    placeholder="000000"
                    className="min-h-14 border border-[var(--border)] rounded-lg"
                    style={{
                      fontSize: 20,
                      lineHeight: 1,
                      letterSpacing: '0.45em',
                      textAlign: 'center',
                      fontFamily: 'ui-monospace, monospace',
                      paddingTop: 12,
                      paddingBottom: 12
                    }}
                    maxLength={6}
                    disabled={isSubmitting}
                  />
                </TextField>
                {pairCode.length > 0 && !pairCodeValid && (
                  <p className="text-[11px]" style={{ color: '#f85149' }}>
                    Pairing code must be exactly 6 digits.
                  </p>
                )}
              </div>
            </ModalBody>

            <ModalFooter className="flex justify-end gap-2 px-2">
              <Button
                variant="ghost"
                className="text-[13px] cursor-pointer"
                onClick={handleClose}
                isDisabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="text-[13px] cursor-pointer"
                onClick={() => {
                  void handleSubmit()
                }}
                isDisabled={!canSubmit}
              >
                {isSubmitting ? 'Adding...' : 'Add Device'}
              </Button>
            </ModalFooter>
          </ModalDialog>
        </ModalContainer>
      </ModalBackdrop>
    </Modal>
  )
}
