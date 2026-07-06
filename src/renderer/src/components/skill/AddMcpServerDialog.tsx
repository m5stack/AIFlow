import React, { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Input,
  ListBox,
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalContainer,
  ModalDialog,
  ModalFooter,
  ModalHeader,
  ModalHeading,
  Select,
  SelectIndicator,
  SelectPopover,
  SelectTrigger,
  SelectValue,
  TextArea,
  TextField
} from '@heroui/react'
import type { CreateMcpServerPayload, McpServerItem, McpTransport } from '../../../../shared/types'

const TRANSPORT_OPTIONS: { id: McpTransport; label: string }[] = [
  { id: 'stdio', label: 'stdio' },
  { id: 'sse', label: 'sse' },
  { id: 'http', label: 'http' }
]

const parseArgs = (raw: string): string[] | undefined => {
  const args = raw
    .split(/[\n,]/)
    .map((arg) => arg.trim())
    .filter(Boolean)
  return args.length > 0 ? args : undefined
}

const parseStringMap = (raw: string, fieldLabel: string): Record<string, string> | undefined => {
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(`${fieldLabel} must be a JSON object.`)
    }
    const entries = Object.entries(parsed as Record<string, unknown>)
    const result: Record<string, string> = {}
    for (const [key, value] of entries) {
      if (typeof value !== 'string') {
        throw new Error(`${fieldLabel} values must be strings.`)
      }
      result[key] = value
    }
    return Object.keys(result).length > 0 ? result : undefined
  } catch (error) {
    if (error instanceof Error && error.message.includes('must be')) throw error
    throw new Error(`Invalid ${fieldLabel} JSON.`)
  }
}

interface AddMcpServerDialogProps {
  isOpen: boolean
  onClose: () => void
  onAdded: (servers: McpServerItem[]) => void
}

export default function AddMcpServerDialog({
  isOpen,
  onClose,
  onAdded
}: AddMcpServerDialogProps): React.JSX.Element {
  const [name, setName] = useState('')
  const [transport, setTransport] = useState<McpTransport>('http')
  const [command, setCommand] = useState('')
  const [args, setArgs] = useState('')
  const [env, setEnv] = useState('')
  const [url, setUrl] = useState('')
  const [headers, setHeaders] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const resetForm = (): void => {
    setName('')
    setTransport('http')
    setCommand('')
    setArgs('')
    setEnv('')
    setUrl('')
    setHeaders('')
    setFormError(null)
  }

  useEffect(() => {
    if (!isOpen) resetForm()
  }, [isOpen])

  const canSubmit = useMemo(() => {
    if (!name.trim()) return false
    if (transport === 'stdio') return Boolean(command.trim())
    return Boolean(url.trim())
  }, [command, name, transport, url])

  const handleClose = (): void => {
    if (isSaving) return
    resetForm()
    onClose()
  }

  const handleSubmit = async (): Promise<void> => {
    if (!canSubmit || isSaving) return

    setIsSaving(true)
    setFormError(null)
    try {
      const payload: CreateMcpServerPayload = {
        name: name.trim(),
        transport
      }

      if (transport === 'stdio') {
        payload.command = command.trim()
        payload.args = parseArgs(args)
        payload.env = parseStringMap(env, 'Env')
      } else {
        payload.url = url.trim()
        payload.headers = parseStringMap(headers, 'Headers')
      }

      const nextServers = await window.ipc.mcp.create(payload)
      onAdded(nextServers)
      handleClose()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to add MCP server')
    } finally {
      setIsSaving(false)
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
        isDismissable={!isSaving}
      >
        <ModalContainer size="lg">
          <ModalDialog>
            <Modal.CloseTrigger />
            <ModalHeader>
              <ModalHeading className="text-lg">Add MCP Server</ModalHeading>
            </ModalHeader>

            <ModalBody className="flex flex-col gap-3 p-2">
              {formError ? <div className="text-[12px] text-muted">{formError}</div> : null}

              <TextField className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-default-500">Server name</label>
                <Input
                  placeholder=""
                  className="text-[13px] border border-[var(--border)] rounded-lg"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={isSaving}
                  variant="secondary"
                />
              </TextField>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-default-500">Transport</label>
                <Select
                  value={transport}
                  onChange={(key) => {
                    const id = key ? String(key) : ''
                    if (id) setTransport(id as McpTransport)
                  }}
                  isDisabled={isSaving}
                  variant="secondary"
                >
                  <SelectTrigger className="border border-[var(--border)] rounded-lg">
                    <SelectValue />
                    <SelectIndicator />
                  </SelectTrigger>
                  <SelectPopover>
                    <ListBox>
                      {TRANSPORT_OPTIONS.map((option) => (
                        <ListBox.Item key={option.id} id={option.id} textValue={option.label}>
                          {option.label}
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </SelectPopover>
                </Select>
              </div>

              {transport === 'stdio' ? (
                <>
                  <TextField className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-medium text-default-500">Command</label>
                    <Input
                      placeholder="npx"
                      className="text-[13px] border border-[var(--border)] rounded-lg"
                      value={command}
                      onChange={(event) => setCommand(event.target.value)}
                      disabled={isSaving}
                      variant="secondary"
                    />
                  </TextField>
                  <TextField className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-medium text-default-500">Args</label>
                    <Input
                      placeholder="Comma or newline separated"
                      className="text-[13px] border border-[var(--border)] rounded-lg"
                      value={args}
                      onChange={(event) => setArgs(event.target.value)}
                      disabled={isSaving}
                      variant="secondary"
                    />
                  </TextField>
                  <TextField className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-medium text-default-500">
                      Env (optional)
                    </label>
                    <TextArea
                      placeholder='{"KEY":"value"}'
                      className="min-h-[72px] resize-y text-[13px] border border-[var(--border)] rounded-lg"
                      value={env}
                      onChange={(event) => setEnv(event.target.value)}
                      disabled={isSaving}
                      variant="secondary"
                      rows={3}
                    />
                  </TextField>
                </>
              ) : (
                <>
                  <TextField className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-medium text-default-500">URL</label>
                    <Input
                      placeholder="https://..."
                      className="text-[13px] border border-[var(--border)] rounded-lg"
                      value={url}
                      onChange={(event) => setUrl(event.target.value)}
                      disabled={isSaving}
                      variant="secondary"
                    />
                  </TextField>
                  <TextField className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-medium text-default-500">
                      Headers (optional)
                    </label>
                    <TextArea
                      placeholder='{"Authorization":"Bearer ..."}'
                      className="min-h-[72px] resize-y text-[13px] border border-[var(--border)] rounded-lg"
                      value={headers}
                      onChange={(event) => setHeaders(event.target.value)}
                      disabled={isSaving}
                      variant="secondary"
                      rows={3}
                    />
                  </TextField>
                </>
              )}
            </ModalBody>

            <ModalFooter className="flex justify-end gap-2 px-2">
              <Button
                variant="ghost"
                className="text-[13px] cursor-pointer"
                onClick={handleClose}
                isDisabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="text-[13px] cursor-pointer"
                isDisabled={!canSubmit || isSaving}
                onClick={() => void handleSubmit()}
              >
                {isSaving ? 'Adding…' : 'Add'}
              </Button>
            </ModalFooter>
          </ModalDialog>
        </ModalContainer>
      </ModalBackdrop>
    </Modal>
  )
}
