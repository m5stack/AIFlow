import React, { useState } from 'react'
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
  TextArea,
  TextField
} from '@heroui/react'
import type { PromptTemplate } from '../../../../shared/types'
import {
  PROMPT_TEMPLATE_CONTENT_MAX_LENGTH,
  PROMPT_TEMPLATE_NAME_MAX_LENGTH
} from '../../../../shared/promptTemplates'
import { TrashIcon } from '../icons/Icons'
import { useConfirmDialog } from '../common/confirmDialogContext'

interface PromptTemplateDialogProps {
  isOpen: boolean
  template?: PromptTemplate
  onClose: () => void
  onSaved: (template: PromptTemplate) => void
  onDeleted: (templateId: string) => void
}

export default function PromptTemplateDialog({
  isOpen,
  template,
  onClose,
  onSaved,
  onDeleted
}: PromptTemplateDialogProps): React.JSX.Element {
  const [name, setName] = useState(template?.name ?? '')
  const [content, setContent] = useState(template?.content ?? '')
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const confirm = useConfirmDialog()
  const isBusy = isSaving || isDeleting

  const handleClose = (): void => {
    if (!isBusy) onClose()
  }

  const handleSave = async (): Promise<void> => {
    const payload = { name: name.trim(), content: content.trim() }
    if (!payload.name || !payload.content) {
      setFormError('Template name and prompt are required.')
      return
    }

    setIsSaving(true)
    setFormError('')
    try {
      const saved = template
        ? await window.ipc.promptTemplate.update({ id: template.id, ...payload })
        : await window.ipc.promptTemplate.create(payload)
      onSaved(saved)
      onClose()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to save prompt template.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (): Promise<void> => {
    if (!template) return
    const confirmed = await confirm({
      title: 'Delete prompt template?',
      description: 'The template will be removed from every conversation using it.',
      itemName: template.name,
      confirmLabel: 'Delete'
    })
    if (!confirmed) return

    setIsDeleting(true)
    setFormError('')
    try {
      await window.ipc.promptTemplate.delete(template.id)
      onDeleted(template.id)
      onClose()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to delete prompt template.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Modal>
      <Modal.Trigger
        aria-hidden
        tabIndex={-1}
        className="fixed size-0 overflow-hidden border-0 p-0 opacity-0 pointer-events-none"
      />
      <ModalBackdrop
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open) handleClose()
        }}
        isDismissable={!isBusy}
      >
        <ModalContainer size="lg">
          <ModalDialog>
            <Modal.CloseTrigger />
            <ModalHeader>
              <ModalHeading className="text-lg">
                {template ? 'Edit Prompt Template' : 'New Prompt Template'}
              </ModalHeading>
            </ModalHeader>

            <ModalBody className="flex flex-col gap-4 p-2">
              {formError ? (
                <div className="text-[12px] text-[#e5484d]" role="alert">
                  {formError}
                </div>
              ) : null}

              <TextField className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[12px] font-medium text-default-500">Name</label>
                  <span className="text-[10px] text-default-500" aria-hidden="true">
                    {name.length}/{PROMPT_TEMPLATE_NAME_MAX_LENGTH}
                  </span>
                </div>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={PROMPT_TEMPLATE_NAME_MAX_LENGTH}
                  disabled={isBusy}
                  className="rounded-lg border border-[var(--border)] text-[13px]"
                  variant="secondary"
                />
              </TextField>

              <TextField className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[12px] font-medium text-default-500">Prompt</label>
                  <span className="text-[10px] text-default-500" aria-hidden="true">
                    {content.length}/{PROMPT_TEMPLATE_CONTENT_MAX_LENGTH}
                  </span>
                </div>
                <TextArea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  maxLength={PROMPT_TEMPLATE_CONTENT_MAX_LENGTH}
                  disabled={isBusy}
                  rows={10}
                  className="min-h-[220px] resize-y rounded-lg border border-[var(--border)] text-[13px] leading-relaxed"
                  variant="secondary"
                />
              </TextField>
            </ModalBody>

            <ModalFooter className="flex justify-between gap-2 px-2">
              <div>
                {template ? (
                  <Button
                    variant="ghost"
                    className="cursor-pointer text-[13px] text-[#ff6b6b]"
                    onClick={() => void handleDelete()}
                    isDisabled={isBusy}
                  >
                    <span className="inline-flex items-center gap-1">
                      <TrashIcon size={12} />
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </span>
                  </Button>
                ) : null}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  className="cursor-pointer text-[13px]"
                  onClick={handleClose}
                  isDisabled={isBusy}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  className="cursor-pointer text-[13px]"
                  onClick={() => void handleSave()}
                  isDisabled={isBusy || !name.trim() || !content.trim()}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </ModalFooter>
          </ModalDialog>
        </ModalContainer>
      </ModalBackdrop>
    </Modal>
  )
}
