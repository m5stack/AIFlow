import React, { forwardRef, useImperativeHandle, useState } from 'react'
import type { Selection } from '@heroui/react'
import { Dropdown, Label } from '@heroui/react'
import { PlusIcon, SettingsIcon, TrashIcon, ChevronDownIcon } from '../icons/Icons'
import type {
  CreateUserModelConfigPayload,
  UpdateUserModelConfigPayload,
  UserModelConfig
} from '../../../../shared/types'
import ConversationModelConfigDialog from './ConversationModelConfigDialog'
import type { ChatModelOption } from '../../types/model'

interface ConversationModelSelectorProps {
  models?: ChatModelOption[]
  selectedModel?: string
  onModelChange?: (model: string) => void
  onAddModel?: (payload: CreateUserModelConfigPayload) => Promise<void>
  onUpdateModel?: (
    modelId: string,
    payload: UpdateUserModelConfigPayload
  ) => Promise<UserModelConfig>
  onDeleteModel?: (modelId: string) => Promise<void>
  disabled?: boolean
}

export interface ConversationModelSelectorHandle {
  openCreateDialog: () => void
}

const ConversationModelSelector = forwardRef<
  ConversationModelSelectorHandle,
  ConversationModelSelectorProps
>(function ConversationModelSelector(
  {
    models = [],
    selectedModel = '',
    onModelChange,
    onAddModel,
    onUpdateModel,
    onDeleteModel,
    disabled = false
  },
  ref
): React.JSX.Element {
  const [modelDialogState, setModelDialogState] = useState<{
    isOpen: boolean
    mode: 'create' | 'edit'
    model?: ChatModelOption
  }>({ isOpen: false, mode: 'create' })
  const [isDeletingModel, setIsDeletingModel] = useState(false)

  const selectedModelConfig = models.find((model) => model.id === selectedModel)
  const selectedModelKeys: Selection = selectedModel ? new Set([selectedModel]) : new Set()

  const handleModelSelectionChange = (keys: Selection): void => {
    if (keys === 'all') return
    const key = Array.from(keys)[0]
    if (key) {
      onModelChange?.(String(key))
    }
  }

  const openCreateModelDialog = (): void => {
    setModelDialogState({ isOpen: true, mode: 'create' })
  }

  useImperativeHandle(ref, () => ({
    openCreateDialog: openCreateModelDialog
  }))

  const openManageModelDialog = (model: ChatModelOption): void => {
    setModelDialogState({ isOpen: true, mode: 'edit', model })
  }

  const handleDeleteModelById = async (model: ChatModelOption): Promise<void> => {
    if (!model.isUserModel) return
    const confirmed = window.confirm(`Delete model "${model.label}"?`)
    if (!confirmed) return
    setIsDeletingModel(true)
    try {
      await onDeleteModel?.(model.id)
      if (modelDialogState.model?.id === model.id) {
        setModelDialogState((state) => ({ ...state, isOpen: false }))
      }
    } finally {
      setIsDeletingModel(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="flex size-7 items-center justify-center rounded text-muted transition-colors hover:bg-soft hover:text-ink"
          title="Add API model"
          onClick={openCreateModelDialog}
        >
          <PlusIcon size={12} />
        </button>
        {models.length === 0 ? (
          <button
            type="button"
            className="flex h-7 items-center rounded-md px-2 text-[11px] text-muted transition-colors hover:bg-soft hover:text-ink"
            onClick={openCreateModelDialog}
          >
            Add model
          </button>
        ) : (
          <Dropdown>
            <Dropdown.Trigger
              className="flex h-7 min-h-7 items-center gap-1 rounded-md border border-line bg-soft px-2 text-[11px] font-normal text-ink"
              isDisabled={disabled}
            >
              <span className="max-w-[140px] truncate">
                {selectedModelConfig?.label ?? 'Select model'}
              </span>
              <ChevronDownIcon size={10} />
            </Dropdown.Trigger>
            <Dropdown.Popover placement="bottom end" className="min-w-[240px]">
              <Dropdown.Menu
                selectedKeys={selectedModelKeys}
                selectionMode="single"
                onSelectionChange={handleModelSelectionChange}
              >
                {models.map((model) => (
                  <Dropdown.Item
                    key={model.id}
                    id={model.id}
                    textValue={model.label}
                    className="gap-2"
                  >
                    <Dropdown.ItemIndicator />
                    <Label className="min-w-0 flex-1 truncate">{model.label}</Label>
                    <div className="ms-auto flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        className="flex h-5 w-5 items-center justify-center rounded text-muted transition-colors hover:bg-soft hover:text-ink"
                        title="Model settings"
                        onPointerDown={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                        }}
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          openManageModelDialog(model)
                        }}
                      >
                        <SettingsIcon size={12} />
                      </button>
                      {model.isUserModel && (
                        <button
                          type="button"
                          className="flex h-5 w-5 items-center justify-center rounded text-[#ff6b6b] transition-colors hover:bg-soft disabled:opacity-50"
                          title="Delete model"
                          disabled={isDeletingModel}
                          onPointerDown={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                          }}
                          onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            void handleDeleteModelById(model)
                          }}
                        >
                          <TrashIcon size={12} />
                        </button>
                      )}
                    </div>
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        )}
      </div>

      <ConversationModelConfigDialog
        isOpen={modelDialogState.isOpen}
        mode={modelDialogState.mode}
        model={modelDialogState.model}
        onClose={() => setModelDialogState((state) => ({ ...state, isOpen: false }))}
        onAddModel={onAddModel}
        onUpdateModel={onUpdateModel}
        onDeleteModel={onDeleteModel}
      />
    </>
  )
})

export default ConversationModelSelector
