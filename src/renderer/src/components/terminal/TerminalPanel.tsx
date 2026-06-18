import React, { useRef, useEffect, useCallback } from 'react'
import { Button } from '@heroui/react'
import { ClearTerminalIcon } from '../icons/Icons'
import { useDeviceStore } from '../../stores/deviceStore'
import { useActiveProjectDevices } from '../../hooks/useActiveProjectDevices'
import {
  useRealtimeTerminal,
  REALTIME_CONNECT_TIMEOUT_SEC,
  type RealtimeTerminalStatus
} from '../../hooks/useRealtimeTerminal'
import PanelShell from '../layout/PanelShell'
import TerminalView, { type TerminalViewHandle } from './TerminalView'

const STATUS_LABELS = {
  idle: 'Disconnected',
  connecting: 'Connecting...',
  connected: 'Connected',
  error: 'Error'
} as const

const STATUS_COLORS = {
  idle: '#71717a',
  connecting: '#fbbf24',
  connected: '#4ade80',
  error: '#f87171'
} as const

function TerminalStatusDot({
  status,
  errorMessage
}: {
  status: RealtimeTerminalStatus
  errorMessage: string
}): React.JSX.Element {
  const statusLabel = STATUS_LABELS[status]
  const tooltip = status === 'error' && errorMessage ? errorMessage : statusLabel

  return (
    <span
      className={`inline-block size-2 shrink-0 rounded-full ${status === 'connecting' ? 'animate-pulse' : ''}`}
      style={{ backgroundColor: STATUS_COLORS[status] }}
      title={tooltip}
      aria-label={statusLabel}
      role="status"
    />
  )
}

export default function TerminalPanel(): React.JSX.Element {
  const fetchDevices = useDeviceStore((state) => state.fetchDevices)
  const { activeProjectId, selectedDevice } = useActiveProjectDevices()
  const selectedDeviceId = selectedDevice?.id ?? ''

  const canConfigureConnection = !!activeProjectId && !!selectedDeviceId
  const canAutoConnect = canConfigureConnection && !selectedDevice?.invalid

  const terminalRef = useRef<TerminalViewHandle>(null)

  const { status, errorMessage, connect, disconnect, sendData, setTerminalDataHandler } =
    useRealtimeTerminal(selectedDeviceId, {
      autoConnect: canAutoConnect,
      deviceName: selectedDevice?.name ?? ''
    })

  const isConnected = status === 'connected'
  const isConnecting = status === 'connecting'
  const canConnect = !!selectedDeviceId && !selectedDevice?.invalid

  const handleConnect = useCallback(async (): Promise<void> => {
    if (!canConfigureConnection || isConnecting || !canConnect) return
    const ok = await connect()
    if (ok) terminalRef.current?.focus()
  }, [canConfigureConnection, canConnect, connect, isConnecting])

  const handleToggleConnection = (): void => {
    if (isConnected) void disconnect()
    else void handleConnect()
  }

  useEffect(() => {
    void fetchDevices()
  }, [fetchDevices])

  useEffect(() => {
    if (status === 'connected' && canAutoConnect) {
      terminalRef.current?.focus()
    }
  }, [status, selectedDeviceId, canAutoConnect])

  const clearTerminalButton = (
    <Button
      isIconOnly
      variant="ghost"
      className="size-7 min-w-7 shrink-0 cursor-pointer"
      onPress={() => {
        terminalRef.current?.clear()
        terminalRef.current?.focus()
      }}
      aria-label="Clear terminal"
    >
      <ClearTerminalIcon size={12} />
    </Button>
  )

  const headerActions = (
    <div className="flex shrink-0 items-center gap-2">
      <TerminalStatusDot status={status} errorMessage={errorMessage} />
      <button
        type="button"
        onClick={handleToggleConnection}
        disabled={!canConfigureConnection || isConnecting || (!isConnected && !canConnect)}
        className="inline-flex shrink-0 cursor-pointer items-center rounded-md border border-line bg-surface-2 px-2 py-1 text-[12px] text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isConnecting ? `${REALTIME_CONNECT_TIMEOUT_SEC}s` : isConnected ? 'Disconnect' : 'Connect'}
      </button>
    </div>
  )

  return (
    <PanelShell
      title="Terminal"
      icon={<span className="font-mono text-[14px]">›_</span>}
      titleActions={clearTerminalButton}
      actions={headerActions}
      className="bg-terminal-bg"
      bodyClassName="min-h-0 overflow-hidden p-0 font-mono text-[13px] leading-relaxed text-ink"
    >
      <div className="h-full min-h-0">
        <TerminalView
          ref={terminalRef as React.Ref<TerminalViewHandle>}
          status={status}
          onSendData={sendData}
          onRegisterDataHandler={setTerminalDataHandler}
        />
      </div>
    </PanelShell>
  )
}
