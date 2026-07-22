import React, { useCallback, useEffect, useRef, useState } from 'react'
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
import {
  ConfirmDialogContext,
  type ConfirmDialogFn,
  type ConfirmDialogOptions
} from './confirmDialogContext'

interface PendingConfirmation {
  resolve: (confirmed: boolean) => void
  restoreFocusTo: HTMLElement | null
}

export default function ConfirmDialogProvider({
  children
}: React.PropsWithChildren): React.JSX.Element {
  const [options, setOptions] = useState<ConfirmDialogOptions | null>(null)
  const pendingRef = useRef<PendingConfirmation | null>(null)
  const focusRestoreTimerRef = useRef<number | null>(null)

  const settle = useCallback((confirmed: boolean): void => {
    const pending = pendingRef.current
    if (!pending) return

    pendingRef.current = null
    setOptions(null)
    pending.resolve(confirmed)

    focusRestoreTimerRef.current = window.setTimeout(() => {
      focusRestoreTimerRef.current = null
      if (!pendingRef.current && pending.restoreFocusTo?.isConnected) {
        pending.restoreFocusTo.focus()
      }
    }, 150)
  }, [])

  const confirm = useCallback<ConfirmDialogFn>((nextOptions) => {
    if (pendingRef.current) return Promise.resolve(false)

    return new Promise<boolean>((resolve) => {
      if (focusRestoreTimerRef.current !== null) {
        window.clearTimeout(focusRestoreTimerRef.current)
        focusRestoreTimerRef.current = null
      }
      pendingRef.current = {
        resolve,
        restoreFocusTo:
          document.activeElement instanceof HTMLElement ? document.activeElement : null
      }
      setOptions(nextOptions)
    })
  }, [])

  useEffect(
    () => () => {
      pendingRef.current?.resolve(false)
      pendingRef.current = null
      if (focusRestoreTimerRef.current !== null) {
        window.clearTimeout(focusRestoreTimerRef.current)
      }
    },
    []
  )

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      {children}
      <Modal>
        <Modal.Trigger
          aria-hidden
          tabIndex={-1}
          className="fixed size-0 overflow-hidden border-0 p-0 opacity-0 pointer-events-none"
        />
        <ModalBackdrop
          isOpen={options !== null}
          onOpenChange={(open) => {
            if (!open) settle(false)
          }}
          isDismissable
          style={{ zIndex: 100 }}
        >
          <ModalContainer size="md">
            <ModalDialog
              role="alertdialog"
              className="w-[min(440px,calc(100vw-2rem))] max-w-[min(440px,calc(100vw-2rem))]!"
            >
              <Modal.CloseTrigger aria-label="Close confirmation" />
              <ModalHeader>
                <ModalHeading className="text-lg">{options?.title}</ModalHeading>
              </ModalHeader>

              <ModalBody className="flex flex-col gap-3 p-2">
                <p className="text-[13px] leading-relaxed text-default-600">
                  {options?.description}
                </p>
                <div className="rounded-lg border border-danger/25 bg-danger-soft px-3 py-2.5">
                  <span className="block break-all text-[13px] font-medium leading-relaxed text-danger-soft-foreground">
                    {options?.itemName}
                  </span>
                </div>
              </ModalBody>

              <ModalFooter className="flex justify-end gap-2 px-2">
                <Button variant="secondary" autoFocus onPress={() => settle(false)}>
                  Cancel
                </Button>
                <Button variant="danger" onPress={() => settle(true)}>
                  {options?.confirmLabel}
                </Button>
              </ModalFooter>
            </ModalDialog>
          </ModalContainer>
        </ModalBackdrop>
      </Modal>
    </ConfirmDialogContext.Provider>
  )
}
