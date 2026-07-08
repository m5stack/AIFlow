import React, { useCallback, useEffect, useState } from 'react'
import type { McpServerItem } from '../../../../shared/types'
import AddMcpServerDialog from './AddMcpServerDialog'
import { EditIcon, McpIcon, PlusIcon, TrashIcon } from '../icons/Icons'

const serverSummary = (server: McpServerItem): string => {
  if (server.transport === 'stdio') {
    const args = server.args?.length ? ` ${server.args.join(' ')}` : ''
    return `${server.command ?? ''}${args}`.trim()
  }
  return server.url ?? ''
}

function McpServerRow({
  server,
  onEdit,
  onDelete
}: {
  server: McpServerItem
  onEdit: (server: McpServerItem) => void
  onDelete: (serverId: string) => void
}): React.JSX.Element {
  return (
    <div className="group flex items-center gap-2 rounded-md border border-line bg-surface-2 px-3 py-2">
      <div className="flex min-w-0 flex-1 items-start gap-2">
        <McpIcon size={14} className="mt-0.5 shrink-0 text-muted" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium text-ink">{server.name}</div>
          <div className="truncate text-[11px] text-muted">
            {server.transport} · {serverSummary(server)}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <button
          type="button"
          className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md border border-line bg-surface text-muted transition-colors hover:bg-soft hover:text-ink"
          aria-label={`Edit ${server.name}`}
          onClick={() => onEdit(server)}
        >
          <EditIcon size={12} />
        </button>
        <button
          type="button"
          className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md border border-line bg-surface text-[#ff6b6b] transition-colors hover:bg-soft"
          aria-label={`Delete ${server.name}`}
          onClick={() => onDelete(server.id)}
        >
          <TrashIcon size={12} />
        </button>
      </div>
    </div>
  )
}

export default function McpTab(): React.JSX.Element {
  const [servers, setServers] = useState<McpServerItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingServer, setEditingServer] = useState<McpServerItem | null>(null)

  const loadServers = useCallback(async (): Promise<void> => {
    setError(null)
    try {
      const nextServers = await window.ipc.mcp.list()
      setServers(nextServers)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load MCP servers')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadServers()
  }, [loadServers])

  const handleDelete = async (serverId: string): Promise<void> => {
    const server = servers.find((item) => item.id === serverId)
    if (!server || !window.confirm(`Delete MCP server "${server.name}"?`)) return

    setError(null)
    const previousServers = servers
    setServers(servers.filter((item) => item.id !== serverId))
    try {
      const nextServers = await window.ipc.mcp.delete(serverId)
      setServers(nextServers)
    } catch (err) {
      setServers(previousServers)
      setError(err instanceof Error ? err.message : 'Failed to delete MCP server')
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-[12px] text-muted">
        Loading MCP servers…
      </div>
    )
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3.5">
        {error ? <div className="text-[12px] text-muted">{error}</div> : null}

        <div className="flex flex-col gap-1.5">
          {servers.length === 0 ? (
            <div className="rounded-md border border-dashed border-line px-3 py-4 text-center text-[12px] text-muted">
              No MCP servers yet.
            </div>
          ) : (
            servers.map((server) => (
              <McpServerRow
                key={server.id}
                server={server}
                onEdit={(item) => {
                  setEditingServer(item)
                  setIsAddDialogOpen(true)
                }}
                onDelete={(id) => void handleDelete(id)}
              />
            ))
          )}
        </div>

        <button
          type="button"
          className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 self-start rounded-md border border-dashed border-line px-3 text-[12px] text-muted transition-colors hover:border-accent hover:bg-soft hover:text-ink"
          onClick={() => {
            setEditingServer(null)
            setIsAddDialogOpen(true)
          }}
        >
          <PlusIcon size={12} />
          Add MCP server
        </button>
      </div>

      <AddMcpServerDialog
        isOpen={isAddDialogOpen}
        onClose={() => {
          setIsAddDialogOpen(false)
          setEditingServer(null)
        }}
        onAdded={setServers}
        server={editingServer ?? undefined}
      />
    </>
  )
}
