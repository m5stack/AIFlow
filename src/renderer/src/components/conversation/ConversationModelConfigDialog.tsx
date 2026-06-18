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
  TextField,
  toast
} from '@heroui/react'
import type {
  CreateUserModelConfigPayload,
  UpdateUserModelConfigPayload,
  UserModelConfig
} from '../../../../shared/types'
import { TrashIcon } from '../icons/Icons'
import FieldExampleHints from '../model/FieldExampleHints'
import type { ChatModelOption } from '../../types/model'
import { BASE_URL_EXAMPLES, MODEL_ID_EXAMPLES } from '../../utils/model/modelFieldExamples'

const DEFAULT_CUSTOM_MODEL_ID = 'claude-opus-4-7'

interface ConversationModelConfigDialogProps {
  isOpen: boolean
  mode: 'create' | 'edit'
  model?: ChatModelOption | null
  onClose: () => void
  onAddModel?: (payload: CreateUserModelConfigPayload) => Promise<void>
  onUpdateModel?: (
    modelId: string,
    payload: UpdateUserModelConfigPayload
  ) => Promise<UserModelConfig>
  onDeleteModel?: (modelId: string) => Promise<void>
}

export default function ConversationModelConfigDialog({
  isOpen,
  mode,
  model,
  onClose,
  onAddModel,
  onUpdateModel,
  onDeleteModel
}: ConversationModelConfigDialogProps): React.JSX.Element {
  const [modelName, setModelName] = useState('')
  const [modelId, setModelId] = useState(DEFAULT_CUSTOM_MODEL_ID)
  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [disableNonessentialTraffic, setDisableNonessentialTraffic] = useState(true)
  const [isSavingModel, setIsSavingModel] = useState(false)
  const [isDeletingModel, setIsDeletingModel] = useState(false)

  const isBusy = isSavingModel || isDeletingModel

  useEffect(() => {
    if (!isOpen) return
    if (mode === 'edit' && model) {
      setModelName(model.label)
      setModelId(model.model)
      setBaseUrl(model.baseUrl ?? '')
      setApiKey('')
      setDisableNonessentialTraffic(model.disableNonessentialTraffic ?? true)
    } else {
      setModelName('')
      setModelId(DEFAULT_CUSTOM_MODEL_ID)
      setBaseUrl('')
      setApiKey('')
      setDisableNonessentialTraffic(true)
    }
  }, [isOpen, mode, model])

  const handleClose = (): void => {
    if (isBusy) return
    onClose()
  }

  const handleSaveModel = async (): Promise<void> => {
    const payload = {
      label: modelName.trim(),
      model: modelId.trim(),
      apiKey: apiKey.trim() || undefined,
      baseUrl: baseUrl.trim() || undefined,
      disableNonessentialTraffic
    }
    if (!payload.label || !payload.model || (mode === 'create' && !payload.apiKey)) {
      toast.warning('Please fill in model name, model ID, and API key.')
      return
    }
    if (mode === 'edit' && !model) return
    setIsSavingModel(true)
    try {
      if (mode === 'create') {
        await onAddModel?.({ ...payload, apiKey: payload.apiKey ?? '' })
      } else if (model) {
        await onUpdateModel?.(model.id, payload)
      }
      onClose()
    } finally {
      setIsSavingModel(false)
    }
  }

  const handleDeleteModel = async (): Promise<void> => {
    if (!model) return
    const confirmed = window.confirm(`Delete model "${model.label}"?`)
    if (!confirmed) return
    setIsDeletingModel(true)
    try {
      await onDeleteModel?.(model.id)
      onClose()
    } finally {
      setIsDeletingModel(false)
    }
  }

  const apiKeyPlaceholder =
    mode === 'edit' ? 'Leave blank to keep current key' : baseUrl.trim() ? 'sk-...' : 'sk-ant-...'

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
        isDismissable={!isBusy}
      >
        <ModalContainer size="lg">
          <ModalDialog>
            <Modal.CloseTrigger />
            <ModalHeader>
              <ModalHeading className="text-lg">
                {mode === 'create' ? 'Add Anthropic API Model' : 'Model Settings'}
              </ModalHeading>
              <p className="mt-1 text-[11px] leading-relaxed text-default-500">
                {mode === 'create'
                  ? 'Supports Anthropic and compatible APIs (e.g. DeepSeek). OpenAI and compatible APIs are not supported.'
                  : 'Update this local model configuration. Leave API key empty to keep the existing key.'}
              </p>
            </ModalHeader>

            <ModalBody className="flex flex-col gap-4 p-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-default-500">
                  Customized Display Name
                </label>
                <TextField value={modelName} onChange={setModelName}>
                  <Input
                    className="border border-[var(--border)] rounded-lg text-[12px]"
                    disabled={isBusy}
                  />
                </TextField>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-default-500">Model</label>
                <TextField value={modelId} onChange={setModelId}>
                  <Input
                    placeholder={DEFAULT_CUSTOM_MODEL_ID}
                    className="border border-[var(--border)] rounded-lg text-[12px]"
                    disabled={isBusy}
                  />
                </TextField>
                <FieldExampleHints
                  examples={MODEL_ID_EXAMPLES}
                  onSelect={setModelId}
                  disabled={isBusy}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-default-500">API Key</label>
                <TextField value={apiKey} onChange={setApiKey}>
                  <Input
                    type="password"
                    placeholder={apiKeyPlaceholder}
                    className="border border-[var(--border)] rounded-lg text-[12px]"
                    disabled={isBusy}
                  />
                </TextField>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-default-500">
                  Base URL (Optional)
                </label>
                <TextField value={baseUrl} onChange={setBaseUrl}>
                  <Input
                    className="border border-[var(--border)] rounded-lg text-[12px]"
                    disabled={isBusy}
                  />
                </TextField>
                <p className="text-[10px] text-default-500 opacity-70">
                  Leave blank for official Anthropic URL, or set a compatible gateway base URL.
                </p>
                <FieldExampleHints
                  examples={BASE_URL_EXAMPLES}
                  onSelect={setBaseUrl}
                  disabled={isBusy}
                />
              </div>
            </ModalBody>

            <ModalFooter className="flex justify-between gap-2 px-2">
              <div>
                {mode === 'edit' && (
                  <Button
                    variant="ghost"
                    className="text-[13px] text-[#ff6b6b] cursor-pointer"
                    onClick={() => {
                      void handleDeleteModel()
                    }}
                    isDisabled={isBusy}
                  >
                    <span className="inline-flex items-center gap-1">
                      <TrashIcon size={12} />
                      {isDeletingModel ? 'Deleting...' : 'Delete'}
                    </span>
                  </Button>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  className="text-[13px] cursor-pointer"
                  onClick={handleClose}
                  isDisabled={isBusy}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  className="text-[13px] cursor-pointer"
                  onClick={() => {
                    void handleSaveModel()
                  }}
                  isDisabled={isBusy}
                >
                  {isSavingModel ? 'Saving...' : mode === 'create' ? 'Add model' : 'Save changes'}
                </Button>
              </div>
            </ModalFooter>
          </ModalDialog>
        </ModalContainer>
      </ModalBackdrop>
    </Modal>
  )
}
