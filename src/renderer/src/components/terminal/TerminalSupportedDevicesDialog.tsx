import React from 'react'
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalContainer,
  ModalDialog,
  ModalHeader,
  ModalHeading
} from '@heroui/react'
import { TERMINAL_SUPPORTED_DEVICES } from '../../../../shared/terminalSupport'

interface TerminalSupportedDevicesDialogProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
}

export default function TerminalSupportedDevicesDialog({
  isOpen,
  onOpenChange
}: TerminalSupportedDevicesDialogProps): React.JSX.Element {
  return (
    <Modal>
      <Modal.Trigger
        aria-hidden
        tabIndex={-1}
        className="fixed size-0 overflow-hidden border-0 p-0 opacity-0 pointer-events-none"
      />
      <ModalBackdrop isOpen={isOpen} onOpenChange={onOpenChange} isDismissable>
        <ModalContainer size="sm">
          <ModalDialog className="w-[min(440px,calc(100vw-2rem))] max-w-[min(440px,calc(100vw-2rem))]!">
            <Modal.CloseTrigger />
            <ModalHeader>
              <ModalHeading className="text-lg">Terminal Supported Devices</ModalHeading>
              <p className="text-[12px] text-muted">
                The following devices require UIFlow2 v2.5.1 or later to use Terminal.
              </p>
            </ModalHeader>
            <ModalBody className="px-2 pb-3 pt-1">
              <ul className="grid grid-cols-2 gap-x-5 gap-y-1.5 text-[13px] text-ink max-[480px]:grid-cols-1">
                {TERMINAL_SUPPORTED_DEVICES.map((device) => (
                  <li key={device.type} className="flex min-w-0 items-center gap-2 py-1">
                    <span className="size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                    <span className="truncate">{device.label}</span>
                  </li>
                ))}
              </ul>
            </ModalBody>
          </ModalDialog>
        </ModalContainer>
      </ModalBackdrop>
    </Modal>
  )
}
