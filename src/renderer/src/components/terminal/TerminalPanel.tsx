import React, { useRef, useEffect, useCallback } from 'react'
import { Button, Tooltip } from '@heroui/react'
import { ClearTerminalIcon } from '../icons/Icons'
import { useActiveProjectDevices } from '../../hooks/useActiveProjectDevices'
import {
  useRealtimeTerminal,
  REALTIME_CONNECT_TIMEOUT_SEC,
  type RealtimeTerminalStatus
} from '../../hooks/useRealtimeTerminal'
import { MP_CTRL } from '../../utils/terminal/pasteFlow'
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

function TerminalStatusDot({ status }: { status: RealtimeTerminalStatus }): React.JSX.Element {
  return (
    <span
      aria-hidden
      className={`inline-block size-2 shrink-0 rounded-full ${status === 'connecting' ? 'animate-pulse' : ''}`}
      style={{ backgroundColor: STATUS_COLORS[status] }}
    />
  )
}

export default function TerminalPanel(): React.JSX.Element {
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

  const handleInterrupt = (): void => {
    if (!isConnected) return
    sendData(MP_CTRL.INTERRUPT)
    terminalRef.current?.focus()
  }

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

  const cliButton = (
    <Tooltip delay={300}>
      <Tooltip.Trigger className="inline-flex">
        <span className="inline-flex">
          <button
            type="button"
            className="inline-flex h-7 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-md border border-line bg-surface-2 px-2 text-[12px] text-muted transition-colors enabled:hover:border-accent enabled:hover:bg-soft enabled:hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!isConnected}
            onClick={handleInterrupt}
            aria-label="Interrupt device and enter CLI (Ctrl+C)"
          >
            CLI
          </button>
        </span>
      </Tooltip.Trigger>
      <Tooltip.Content placement="top" showArrow>
        Interrupt device and enter CLI (Ctrl+C)
      </Tooltip.Content>
    </Tooltip>
  )

  const connectionButtonTitle =
    status === 'error' && errorMessage ? errorMessage : STATUS_LABELS[status]

  const connectionButton = (
    <button
      type="button"
      onClick={handleToggleConnection}
      disabled={!canConfigureConnection || isConnecting || (!isConnected && !canConnect)}
      aria-label={isConnected ? 'Disconnect' : 'Connect'}
      title={connectionButtonTitle}
      className={`group inline-flex h-7 min-w-[96px] shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-line bg-surface-2 px-2 text-[12px] text-muted transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        isConnecting
          ? ''
          : isConnected
            ? 'enabled:hover:border-[#f87171] enabled:hover:bg-[#f87171]/10 enabled:hover:text-[#f87171]'
            : 'enabled:hover:border-[#4ade80] enabled:hover:bg-[#4ade80]/10 enabled:hover:text-[#4ade80]'
      }`}
    >
      <TerminalStatusDot status={status} />
      {isConnecting ? (
        `${REALTIME_CONNECT_TIMEOUT_SEC}s`
      ) : isConnected ? (
        <>
          <span className="group-hover:hidden">Connected</span>
          <span className="hidden group-hover:inline">Disconnect</span>
        </>
      ) : (
        <>
          <span className="group-hover:hidden">Disconnected</span>
          <span className="hidden group-hover:inline">Connect</span>
        </>
      )}
    </button>
  )

  const headerActions = (
    <div className="flex items-center gap-1.5">
      {cliButton}
      {connectionButton}
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
      <div className="h-full min-h-0 p-3">
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
