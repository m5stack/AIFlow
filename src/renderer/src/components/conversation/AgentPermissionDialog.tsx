import React, { useMemo } from 'react'
import {
  Button,
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalContainer,
  ModalDialog,
  ModalFooter,
  ModalHeader,
  ModalHeading
} from '@heroui/react'
import type { AgentPermissionRequest } from '../../../../shared/types'

interface AgentPermissionDialogProps {
  request: AgentPermissionRequest | null
  onRespond: (behavior: 'allow' | 'deny') => void
}

export default function AgentPermissionDialog({
  request,
  onRespond
}: AgentPermissionDialogProps): React.JSX.Element {
  const isOpen = request !== null
  const inputPreview = useMemo(() => {
    if (!request) return ''
    return JSON.stringify(request.input, null, 2)
  }, [request])

  const handleClose = (): void => {
    onRespond('deny')
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
        isDismissable
      >
        <ModalContainer size="md">
          <ModalDialog>
            <Modal.CloseTrigger />
            <ModalHeader>
              <ModalHeading className="text-lg">
                {request?.title || `${request?.toolName ?? '工具'} 请求权限`}
              </ModalHeading>
              {request?.description ? (
                <p className="mt-1 text-[11px] leading-relaxed text-default-500">
                  {request.description}
                </p>
              ) : null}
            </ModalHeader>

            <ModalBody className="flex flex-col gap-3 p-2">
              {request ? (
                <>
                  <div className="flex flex-col gap-1">
                    <span className="text-[12px] font-medium text-default-500">工具</span>
                    <span className="rounded-lg border border-[var(--border)] bg-default-50 px-3 py-2 text-[12px] font-mono text-default-700">
                      {request.toolName}
                    </span>
                  </div>

                  {request.blockedPath ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-[12px] font-medium text-default-500">涉及路径</span>
                      <span className="rounded-lg border border-[var(--border)] bg-default-50 px-3 py-2 text-[12px] font-mono text-default-700 break-all">
                        {request.blockedPath}
                      </span>
                    </div>
                  ) : null}

                  {inputPreview ? (
                    <details className="group">
                      <summary className="cursor-pointer text-[12px] font-medium text-default-500 select-none">
                        查看请求参数
                      </summary>
                      <pre className="mt-2 max-h-48 overflow-auto rounded-lg border border-[var(--border)] bg-default-50 p-3 text-[11px] leading-relaxed text-default-700">
                        {inputPreview}
                      </pre>
                    </details>
                  ) : null}
                </>
              ) : null}
            </ModalBody>

            <ModalFooter>
              <Button variant="secondary" onPress={() => onRespond('deny')}>
                拒绝
              </Button>
              <Button variant="primary" onPress={() => onRespond('allow')}>
                允许
              </Button>
            </ModalFooter>
          </ModalDialog>
        </ModalContainer>
      </ModalBackdrop>
    </Modal>
  )
}
