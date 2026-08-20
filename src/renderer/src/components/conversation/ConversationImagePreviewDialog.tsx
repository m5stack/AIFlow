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
import type { ChatImageAttachment } from '../../types/chat'

interface ConversationImagePreviewDialogProps {
  image: ChatImageAttachment | null
  onClose: () => void
}

const imageDataUrl = (image: ChatImageAttachment): string =>
  `data:${image.mediaType};base64,${image.data}`

export default function ConversationImagePreviewDialog({
  image,
  onClose
}: ConversationImagePreviewDialogProps): React.JSX.Element {
  return (
    <Modal>
      <Modal.Trigger
        aria-hidden
        tabIndex={-1}
        className="fixed size-0 overflow-hidden border-0 p-0 opacity-0 pointer-events-none"
      />
      <ModalBackdrop
        isOpen={image !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) onClose()
        }}
        isDismissable
      >
        <ModalContainer size="lg">
          <ModalDialog className="w-[min(960px,calc(100vw-2rem))] max-w-[min(960px,calc(100vw-2rem))]!">
            <Modal.CloseTrigger />
            <ModalHeader>
              <ModalHeading className="truncate text-lg" title={image?.name}>
                {image?.name ?? 'Image preview'}
              </ModalHeading>
              <p className="text-[12px] text-muted">Image preview</p>
            </ModalHeader>
            <ModalBody className="min-h-0 p-3 pt-0">
              {image ? (
                <div className="flex h-[min(72vh,720px)] min-h-60 items-center justify-center overflow-auto rounded-lg bg-soft p-2">
                  <img
                    src={imageDataUrl(image)}
                    alt={image.name}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ) : null}
            </ModalBody>
          </ModalDialog>
        </ModalContainer>
      </ModalBackdrop>
    </Modal>
  )
}
