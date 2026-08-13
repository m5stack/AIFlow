import React, { useEffect, useMemo, useState } from 'react'
import type { Selection } from '@heroui/react'
import { Dropdown, Label, toast } from '@heroui/react'
import { FaEllipsis } from 'react-icons/fa6'
import type { PromptTemplate } from '../../../../shared/types'
import { CloseIcon, EditIcon, PlusIcon } from '../icons/Icons'
import PromptTemplateDialog from './PromptTemplateDialog'
import { usePromptTemplateStore } from '../../stores/promptTemplateStore'

const CREATE_TEMPLATE_ID = '__create_prompt_template__'
const idleTriggerClassName =
  'flex h-6 min-h-6 shrink-0 items-center justify-center gap-1 rounded-full border border-line bg-surface/90 px-2 text-muted shadow-sm outline-none backdrop-blur-sm transition-[color,background-color,border-color,box-shadow] hover:border-accent hover:bg-soft hover:text-ink hover:shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40'

export interface ConversationPromptSelectorProps {
  activeTemplateId?: string
  disabled?: boolean
  onActiveTemplateChange: (templateId?: string) => Promise<void>
}

export default function ConversationPromptSelector({
  activeTemplateId,
  disabled = false,
  onActiveTemplateChange
}: ConversationPromptSelectorProps): React.JSX.Element {
  const [isChanging, setIsChanging] = useState(false)
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean
    template?: PromptTemplate
  }>({ isOpen: false })
  const templates = usePromptTemplateStore((state) => state.templates)
  const isLoaded = usePromptTemplateStore((state) => state.isLoaded)
  const loadTemplates = usePromptTemplateStore((state) => state.loadTemplates)
  const upsertTemplate = usePromptTemplateStore((state) => state.upsertTemplate)
  const removeTemplate = usePromptTemplateStore((state) => state.removeTemplate)

  useEffect(() => {
    void loadTemplates().catch((error) => {
      toast.danger(
        `Failed to load prompt templates: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    })
  }, [loadTemplates])

  const activeTemplate = useMemo(
    () => templates.find((template) => template.id === activeTemplateId),
    [activeTemplateId, templates]
  )
  const selectedKeys: Selection = activeTemplate ? new Set([activeTemplate.id]) : new Set()

  const changeActiveTemplate = async (templateId?: string): Promise<void> => {
    if (isChanging || templateId === activeTemplateId) return
    setIsChanging(true)
    try {
      await onActiveTemplateChange(templateId)
    } catch (error) {
      toast.danger(
        `Failed to update prompt template: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    } finally {
      setIsChanging(false)
    }
  }

  const handleSelectionChange = (keys: Selection): void => {
    if (keys === 'all') return
    const selectedId = String(Array.from(keys)[0] ?? '')
    if (!selectedId) return
    if (selectedId === CREATE_TEMPLATE_ID) {
      setDialogState({ isOpen: true })
      return
    }
    void changeActiveTemplate(selectedId)
  }

  const openCreateDialog = (): void => setDialogState({ isOpen: true })
  const selectorTooltip =
    isLoaded && templates.length === 0 ? 'Create prompt template' : 'Prompt templates'

  const templateMenu = (trigger: React.ReactNode): React.JSX.Element => (
    <Dropdown>
      {trigger}
      <Dropdown.Popover placement="bottom start" className="min-w-[260px]">
        <Dropdown.Menu
          selectionMode="single"
          selectedKeys={selectedKeys}
          onSelectionChange={handleSelectionChange}
        >
          <Dropdown.Item
            id={CREATE_TEMPLATE_ID}
            key={CREATE_TEMPLATE_ID}
            textValue="New prompt template"
          >
            <PlusIcon size={12} />
            <Label>New prompt template</Label>
          </Dropdown.Item>
          {templates.map((template) => (
            <Dropdown.Item key={template.id} id={template.id} textValue={template.name}>
              <Dropdown.ItemIndicator />
              <Label className="min-w-0 flex-1 truncate">{template.name}</Label>
              <button
                type="button"
                className="ms-auto flex size-5 shrink-0 items-center justify-center rounded text-muted outline-none transition-colors hover:bg-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
                aria-label={`Edit ${template.name}`}
                title={`Edit ${template.name}`}
                onPointerDown={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                }}
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  setDialogState({ isOpen: true, template })
                }}
              >
                <EditIcon size={11} />
              </button>
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  )

  const selectorControl =
    isLoaded && templates.length === 0 ? (
      <button
        type="button"
        className={idleTriggerClassName}
        onClick={openCreateDialog}
        disabled={disabled || isChanging}
        aria-label="Create prompt template"
        title={selectorTooltip}
      >
        {/* <FaEllipsis size={12} aria-hidden /> */}
        <span className="text-[10px] leading-none">Custom Prompt</span>
      </button>
    ) : activeTemplate ? (
      <span className="inline-flex h-6 w-fit min-w-0 max-w-[150px] items-center rounded-full border border-line bg-surface/90 text-[10px] text-ink shadow-sm backdrop-blur-sm">
        {templateMenu(
          <Dropdown.Trigger
            className="flex h-full min-h-0 min-w-0 flex-1 items-center rounded-l-full px-2 text-left outline-none transition-colors hover:bg-soft focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
            isDisabled={disabled || isChanging || !isLoaded}
            aria-label={`Prompt template: ${activeTemplate.name}`}
          >
            <span className="min-w-0 flex-1 truncate" title={activeTemplate.name}>
              {activeTemplate.name}
            </span>
          </Dropdown.Trigger>
        )}
        <button
          type="button"
          className="mr-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-muted outline-none transition-colors hover:bg-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent disabled:opacity-40"
          onClick={() => void changeActiveTemplate(undefined)}
          disabled={disabled || isChanging}
          aria-label={`Disable ${activeTemplate.name}`}
          title="Disable prompt template"
        >
          <CloseIcon size={9} />
        </button>
      </span>
    ) : (
      <span className="inline-flex" title={selectorTooltip}>
        {templateMenu(
          <Dropdown.Trigger
            className={idleTriggerClassName}
            isDisabled={disabled || isChanging || !isLoaded}
            aria-label="Prompt templates"
          >
            {/* <FaEllipsis size={12} aria-hidden /> */}
            <span className="text-[10px] leading-none">Custom Prompt</span>
          </Dropdown.Trigger>
        )}
      </span>
    )

  return (
    <>
      <div className="flex w-full min-w-0 max-w-full items-center justify-center gap-1">
        {selectorControl}
      </div>

      <PromptTemplateDialog
        key={`${dialogState.template?.id ?? 'new'}-${dialogState.isOpen ? 'open' : 'closed'}`}
        isOpen={dialogState.isOpen}
        template={dialogState.template}
        onClose={() => setDialogState({ isOpen: false })}
        onSaved={(saved) => {
          upsertTemplate(saved)
          if (!dialogState.template) void changeActiveTemplate(saved.id)
        }}
        onDeleted={(templateId) => {
          removeTemplate(templateId)
          if (templateId === activeTemplateId) void changeActiveTemplate(undefined)
        }}
      />
    </>
  )
}
