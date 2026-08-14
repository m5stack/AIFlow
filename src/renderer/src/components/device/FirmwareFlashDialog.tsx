import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ESPLoader,
  Transport,
  type FlashFreqValues,
  type FlashModeValues,
  type FlashSizeValues,
  type IEspLoaderTerminal
} from 'esptool-js'
import {
  Button,
  Input,
  Label,
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalContainer,
  ModalDialog,
  ModalFooter,
  ModalHeader,
  ModalHeading,
  ProgressBar,
  Tooltip,
  ListBox,
  Select,
  SelectIndicator,
  SelectPopover,
  SelectTrigger,
  SelectValue,
  TextField
} from '@heroui/react'
import {
  normalizeFirmwareDeviceType,
  type FirmwareSelectionEntry
} from '../../../../shared/firmware'
import {
  downloadRemoteFirmware,
  getLatestRemoteFirmwares,
  isFirmwareRequestCanceled
} from '../../api/firmware'
import { EyeIcon, EyeSlashIcon, RefreshIcon } from '../icons/Icons'
import {
  generateUpdatedUiflow2NvsBin,
  generateUiflow2NvsBin,
  mixinNvsIntoFirmware,
  UIFLOW2_DEFAULT_SERVER,
  UIFLOW2_NVS_DEFAULTS,
  UIFLOW2_NVS_OFFSET,
  UIFLOW2_NVS_PARTITION_SIZE,
  verifyUiflow2NvsUpdate,
  type Uiflow2NvsUpdate
} from '../../utils/device/uiflow2Nvs'
import { resolveDeviceImage } from '../../utils/device/deviceImage'

const CONNECT_TIMEOUT_MS = 30000
const DISCONNECT_TIMEOUT_MS = 5000
const FIELD_LABEL_CLASS = 'text-[12px] font-medium text-default-500'

type FirmwareDialogMode = 'firmware' | 'config'

class FirmwareTransport extends Transport {
  override trace(): void {
    // esptool calls trace on some paths even when tracing is disabled.
  }
}

class FirmwareOperationStoppedError extends Error {
  constructor() {
    super('Firmware operation stopped')
    this.name = 'FirmwareOperationStoppedError'
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer)) as Promise<T>
}

async function disconnectTransport(transport: Transport): Promise<void> {
  try {
    await withTimeout(transport.disconnect(), DISCONNECT_TIMEOUT_MS, 'Disconnect timed out')
  } catch {
    // The port may already be closed by a reset or a concurrent stop request.
  }
}

interface SerialPortInfo {
  portId: string
  portName: string
  displayName?: string
  manufacturerName?: string
  vendorId?: string
  productId?: string
}

interface WebSerialNavigator extends Navigator {
  serial?: {
    requestPort: () => Promise<unknown>
  }
}

interface FirmwareFlashDialogProps {
  isOpen: boolean
  onClose: () => void
  currentDeviceType?: string
}

interface PasswordVisibilityButtonProps {
  isVisible: boolean
  isDisabled: boolean
  onToggle: () => void
}

function PasswordVisibilityButton({
  isVisible,
  isDisabled,
  onToggle
}: PasswordVisibilityButtonProps): React.JSX.Element {
  const label = isVisible ? 'Hide password' : 'Show password'
  return (
    <button
      type="button"
      className="absolute right-1 top-1/2 z-10 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-default-400 outline-none transition-colors enabled:cursor-pointer enabled:hover:bg-default-100 enabled:hover:text-default-700 focus-visible:ring-2 focus-visible:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-40"
      aria-label={label}
      aria-pressed={isVisible}
      title={label}
      disabled={isDisabled}
      onClick={onToggle}
    >
      {isVisible ? <EyeSlashIcon size={12} /> : <EyeIcon size={12} />}
    </button>
  )
}

function FirmwareCard({
  firmware,
  isSelected,
  isDisabled,
  onSelect
}: {
  firmware: FirmwareSelectionEntry
  isSelected: boolean
  isDisabled: boolean
  onSelect: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      disabled={isDisabled}
      onClick={onSelect}
      aria-label={`${firmware.deviceLabel} ${firmware.version}`}
      className={`group flex h-[96px] min-w-0 flex-col items-stretch rounded-md border p-1 text-left outline-none transition-colors focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20 ${
        isSelected
          ? 'border-accent bg-accent/10'
          : 'border-default-200 bg-default-50 hover:bg-default-100'
      } disabled:cursor-not-allowed disabled:opacity-60`}
    >
      <span className="flex h-[54px] w-full items-center justify-center rounded bg-default-100 p-1">
        <img
          src={resolveDeviceImage(firmware.deviceType)}
          alt=""
          aria-hidden="true"
          className="max-h-full max-w-full object-contain"
        />
      </span>
      <span className="mt-0.5 min-w-0 text-center">
        <span className="block truncate text-[10px] font-semibold leading-[13px] text-default-700">
          {firmware.deviceLabel}
        </span>
        <span className="block truncate font-mono text-[9px] leading-[12px] text-default-500">
          {firmware.version}
        </span>
      </span>
    </button>
  )
}

function FirmwareListPlaceholder({ message }: { message: string }): React.JSX.Element {
  return (
    <div
      className="flex h-[198px] items-center justify-center rounded-md border border-dashed border-default-200 bg-default-50 px-4 text-center text-[11px] text-default-400"
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  )
}

export default function FirmwareFlashDialog({
  isOpen,
  onClose,
  currentDeviceType
}: FirmwareFlashDialogProps): React.JSX.Element | null {
  if (!isOpen) return null
  return <FirmwareFlashDialogContent onClose={onClose} currentDeviceType={currentDeviceType} />
}

function FirmwareFlashDialogContent({
  onClose,
  currentDeviceType
}: Pick<FirmwareFlashDialogProps, 'onClose' | 'currentDeviceType'>): React.JSX.Element {
  const [mode, setMode] = useState<FirmwareDialogMode>('firmware')
  const [isWorking, setIsWorking] = useState(false)
  const [isStopping, setIsStopping] = useState(false)
  const [flashSucceeded, setFlashSucceeded] = useState(false)
  const [isSelectingPort, setIsSelectingPort] = useState(false)
  const [flashProgress, setFlashProgress] = useState(0)
  const [flashLogs, setFlashLogs] = useState<string[]>([])
  const [availablePorts, setAvailablePorts] = useState<SerialPortInfo[]>([])
  const [selectedPortId, setSelectedPortId] = useState('')
  const [selectedPort, setSelectedPort] = useState<unknown>(null)
  const [remoteFirmwares, setRemoteFirmwares] = useState<FirmwareSelectionEntry[]>([])
  const [firmwareSearch, setFirmwareSearch] = useState('')
  const [selectedFirmwareId, setSelectedFirmwareId] = useState('')
  const [isLoadingRemote, setIsLoadingRemote] = useState(true)
  const [remoteError, setRemoteError] = useState('')
  const [server, setServer] = useState(UIFLOW2_DEFAULT_SERVER)
  const [wifiSsid, setWifiSsid] = useState('')
  const [wifiPassword, setWifiPassword] = useState('')
  const [isWifiPasswordVisible, setIsWifiPasswordVisible] = useState(false)
  const [configServer, setConfigServer] = useState('')
  const [configWifiSsid, setConfigWifiSsid] = useState('')
  const [configWifiPassword, setConfigWifiPassword] = useState('')
  const [isConfigWifiPasswordVisible, setIsConfigWifiPasswordVisible] = useState(false)
  const [configValidationError, setConfigValidationError] = useState('')
  const preferredPortIdRef = useRef('')
  const logContainerRef = useRef<HTMLDivElement>(null)
  const activeTransportRef = useRef<Transport | null>(null)
  const catalogRequestRef = useRef<AbortController | null>(null)
  const downloadRequestRef = useRef<AbortController | null>(null)
  const stopRequestedRef = useRef(false)

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [flashLogs])

  const selectedFirmware = remoteFirmwares.find((item) => item.id === selectedFirmwareId)
  const filteredFirmwares = useMemo(() => {
    const query = firmwareSearch.trim().toLocaleLowerCase()
    if (!query) return remoteFirmwares
    return remoteFirmwares.filter((firmware) =>
      [firmware.deviceLabel, firmware.deviceType, firmware.version].some((value) =>
        value.toLocaleLowerCase().includes(query)
      )
    )
  }, [firmwareSearch, remoteFirmwares])

  const loadRemoteFirmwares = useCallback(async (): Promise<void> => {
    catalogRequestRef.current?.abort()
    const controller = new AbortController()
    catalogRequestRef.current = controller
    setIsLoadingRemote(true)
    setRemoteError('')
    try {
      const entries = await getLatestRemoteFirmwares(controller.signal)
      if (catalogRequestRef.current !== controller || controller.signal.aborted) return
      if (import.meta.env.DEV) {
        console.table(
          entries.map(({ id, deviceLabel, deviceType, version, source, downloadUrl }) => ({
            id,
            deviceLabel,
            deviceType,
            version,
            source,
            downloadUrl
          }))
        )
      }
      setRemoteFirmwares(entries)
      const current = currentDeviceType ? normalizeFirmwareDeviceType(currentDeviceType) : ''
      const preferred = current
        ? entries.find((entry) => normalizeFirmwareDeviceType(entry.deviceType) === current)
        : undefined
      setSelectedFirmwareId(preferred?.id ?? entries[0]?.id ?? '')
    } catch (error) {
      if (controller.signal.aborted || isFirmwareRequestCanceled(error)) return
      setRemoteFirmwares([])
      setRemoteError(error instanceof Error ? error.message : 'Unable to load online firmware.')
      setSelectedFirmwareId('')
    } finally {
      if (catalogRequestRef.current === controller) {
        catalogRequestRef.current = null
        setIsLoadingRemote(false)
      }
    }
  }, [currentDeviceType])

  useEffect(() => {
    let disposed = false
    queueMicrotask(() => {
      if (!disposed) void loadRemoteFirmwares()
    })
    return () => {
      disposed = true
      catalogRequestRef.current?.abort()
      catalogRequestRef.current = null
      downloadRequestRef.current?.abort()
      downloadRequestRef.current = null
    }
  }, [loadRemoteFirmwares])

  const appendFlashLog = useCallback((line: string): void => {
    const content = line.trim()
    if (!content) return
    const now = new Date().toLocaleTimeString('en-GB', { hour12: false })
    setFlashLogs((prev) => [...prev, `${now} ${content}`])
  }, [])

  const createLoader = (transport: Transport): ESPLoader => {
    const terminal: IEspLoaderTerminal = {
      clean: () => undefined,
      write: (data: string) => appendFlashLog(data),
      writeLine: (data: string) => appendFlashLog(data)
    }
    return new ESPLoader({ transport, baudrate: 115200, terminal, debugLogging: false })
  }

  const throwIfStopRequested = (): void => {
    if (stopRequestedRef.current) throw new FirmwareOperationStoppedError()
  }

  const handleStop = async (): Promise<void> => {
    if (!isWorking || isStopping) return

    stopRequestedRef.current = true
    setIsStopping(true)
    downloadRequestRef.current?.abort()
    appendFlashLog(
      mode === 'firmware' ? 'Stopping firmware flash...' : 'Stopping configuration update...'
    )

    const transport = activeTransportRef.current
    if (!transport) return
    await disconnectTransport(transport)
    if (activeTransportRef.current === transport) activeTransportRef.current = null
  }

  const changeMode = (nextMode: FirmwareDialogMode): void => {
    setMode(nextMode)
    setFlashLogs([])
    setFlashProgress(0)
    setFlashSucceeded(false)
    setConfigValidationError('')
  }

  const buildConfigUpdate = (): Uiflow2NvsUpdate | null => {
    const ssid = configWifiSsid.trim()
    const hasSsid = ssid.length > 0
    const hasPassword = configWifiPassword.length > 0
    const serverHost = configServer.trim()

    if (hasSsid !== hasPassword) {
      setConfigValidationError('WiFi SSID and password must be entered together.')
      return null
    }
    if (!hasSsid && !serverHost) {
      setConfigValidationError('Enter WiFi credentials, a server, or both.')
      return null
    }

    setConfigValidationError('')
    return {
      ...(hasSsid ? { wifi: { ssid, password: configWifiPassword } } : {}),
      ...(serverHost ? { server: serverHost } : {})
    }
  }

  const startSerialPortSelection = useCallback(
    async (preferredPortId?: string): Promise<void> => {
      const serialApi = (navigator as WebSerialNavigator).serial
      if (!serialApi) {
        appendFlashLog('Web Serial API is not available in current runtime.')
        return
      }

      try {
        preferredPortIdRef.current = preferredPortId ?? ''
        setIsSelectingPort(true)
        setAvailablePorts([])
        setSelectedPortId('')
        appendFlashLog('Requesting serial port...')
        const port = await serialApi.requestPort()
        setSelectedPort(port)
        appendFlashLog('Serial port selected.')
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.toLowerCase().includes('cancel') || msg.toLowerCase().includes('abort')) {
          appendFlashLog('Port selection cancelled.')
          return
        }
        appendFlashLog(`Port selection failed: ${msg}`)
        appendFlashLog('Make sure device is connected via USB and try again.')
      } finally {
        preferredPortIdRef.current = ''
        setIsSelectingPort(false)
      }
    },
    [appendFlashLog]
  )

  // The dialog content is mounted only while open, so this listener follows its lifetime.
  useEffect(() => {
    const serialApi = window.ipc?.serial
    if (!serialApi) return

    const offPortList = serialApi.onPortList((ports) => {
      setAvailablePorts(ports)
      setSelectedPortId((previous) => {
        const preferredPortId = preferredPortIdRef.current
        const preferredExists =
          preferredPortId && ports.some((port) => port.portId === preferredPortId)
        const previousExists = previous && ports.some((port) => port.portId === previous)
        const targetPortId = preferredExists
          ? preferredPortId
          : previousExists
            ? previous
            : (ports[0]?.portId ?? '')
        if (targetPortId) window.ipc.serial.selectPort(targetPortId)
        return targetPortId
      })
    })

    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) void startSerialPortSelection()
    })
    return () => {
      cancelled = true
      offPortList()
    }
  }, [startSerialPortSelection])

  const handleFlashFirmware = async (): Promise<void> => {
    if (!selectedPort) {
      appendFlashLog('Please select a serial port first.')
      return
    }
    if (!selectedFirmware) {
      appendFlashLog('Please select an online firmware first.')
      return
    }

    stopRequestedRef.current = false
    setIsStopping(false)
    setIsWorking(true)
    setFlashSucceeded(false)
    setFlashProgress(0)
    appendFlashLog('Port ready. Loading online firmware...')

    let transport: Transport | null = null
    let resetDone = false
    let writeStarted = false
    try {
      const controller = new AbortController()
      downloadRequestRef.current = controller
      let binary: Uint8Array
      try {
        binary = await downloadRemoteFirmware(selectedFirmware.downloadUrl, controller.signal)
      } finally {
        if (downloadRequestRef.current === controller) downloadRequestRef.current = null
      }
      throwIfStopRequested()
      appendFlashLog(
        `Firmware loaded: ${selectedFirmware.deviceLabel} ${selectedFirmware.version}.`
      )

      const ssid = wifiSsid.trim()
      if (ssid && !wifiPassword) {
        appendFlashLog('Warning: WiFi password is empty.')
      }
      const serverHost = server.trim() || UIFLOW2_DEFAULT_SERVER
      appendFlashLog('Generating UIFlow2 NVS config...')
      appendFlashLog(`  server: ${serverHost}`)
      if (ssid) appendFlashLog(`  ssid: ${ssid}`)
      appendFlashLog(
        `  net_mode: ${UIFLOW2_NVS_DEFAULTS.netMode}, protocol: ${UIFLOW2_NVS_DEFAULTS.protocol}`
      )
      const nvsBin = await generateUiflow2NvsBin({ ssid, pwd: wifiPassword, server: serverHost })
      throwIfStopRequested()
      const firmwareWithNvs = new Uint8Array(mixinNvsIntoFirmware(binary, nvsBin))
      appendFlashLog('NVS config merged into firmware image.')

      transport = new FirmwareTransport(selectedPort, false)
      activeTransportRef.current = transport

      const loader = createLoader(transport)

      appendFlashLog('Connecting to device bootloader...')
      await withTimeout(
        loader.main('default_reset'),
        CONNECT_TIMEOUT_MS,
        `Connection timed out after ${CONNECT_TIMEOUT_MS / 1000}s. Put the device in download mode and try again.`
      )
      throwIfStopRequested()

      appendFlashLog('Writing flash, please wait...')
      writeStarted = true
      await loader.writeFlash({
        fileArray: [{ data: firmwareWithNvs, address: 0x0 }],
        flashMode: 'dio' as FlashModeValues,
        flashFreq: '40m' as FlashFreqValues,
        flashSize: 'keep' as FlashSizeValues,
        eraseAll: true,
        compress: true,
        reportProgress: (_index, written, total) => {
          setFlashProgress(total > 0 ? Math.round((written / total) * 100) : 0)
        }
      })
      throwIfStopRequested()

      await loader.after('hard_reset')
      throwIfStopRequested()
      resetDone = true
      setFlashProgress(100)
      appendFlashLog('Flash completed successfully.')
      setFlashSucceeded(true)
    } catch (error) {
      if (stopRequestedRef.current || error instanceof FirmwareOperationStoppedError) {
        setFlashProgress(0)
        appendFlashLog(
          writeStarted
            ? 'Flash stopped. Firmware may be incomplete; flash again before using the device.'
            : 'Flash stopped.'
        )
      } else {
        appendFlashLog(`Flash failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    } finally {
      if (transport && !resetDone && activeTransportRef.current === transport) {
        await disconnectTransport(transport)
      }
      if (activeTransportRef.current === transport) activeTransportRef.current = null
      downloadRequestRef.current = null
      stopRequestedRef.current = false
      setIsStopping(false)
      setIsWorking(false)
    }
  }

  const handleUpdateConfig = async (): Promise<void> => {
    const update = buildConfigUpdate()
    if (!update) return
    if (!selectedPort) {
      appendFlashLog('Please select a serial port first.')
      return
    }

    stopRequestedRef.current = false
    setIsStopping(false)
    setIsWorking(true)
    setFlashSucceeded(false)
    setFlashProgress(0)
    appendFlashLog('Port ready. Preparing configuration update...')
    if (update.wifi) appendFlashLog('WiFi credentials will be updated.')
    if (update.server !== undefined) appendFlashLog('Server will be updated.')

    let transport: Transport | null = null
    let resetDone = false
    let writeStarted = false
    try {
      transport = new FirmwareTransport(selectedPort, false)
      activeTransportRef.current = transport
      const loader = createLoader(transport)

      appendFlashLog('Connecting to device bootloader...')
      await withTimeout(
        loader.main('default_reset'),
        CONNECT_TIMEOUT_MS,
        `Connection timed out after ${CONNECT_TIMEOUT_MS / 1000}s. Put the device in download mode and try again.`
      )
      throwIfStopRequested()

      appendFlashLog('Reading current device configuration...')
      const currentNvs = await loader.readFlash(
        UIFLOW2_NVS_OFFSET,
        UIFLOW2_NVS_PARTITION_SIZE,
        (_packet, received, total) => {
          setFlashProgress(total > 0 ? Math.round((received / total) * 30) : 0)
        }
      )
      throwIfStopRequested()

      appendFlashLog('Merging configuration while preserving existing values...')
      const updatedNvs = await generateUpdatedUiflow2NvsBin(currentNvs, update)
      throwIfStopRequested()
      verifyUiflow2NvsUpdate(updatedNvs, update)
      setFlashProgress(35)

      appendFlashLog('Writing NVS configuration only...')
      writeStarted = true
      await loader.writeFlash({
        fileArray: [{ data: updatedNvs, address: UIFLOW2_NVS_OFFSET }],
        flashMode: 'dio' as FlashModeValues,
        flashFreq: '40m' as FlashFreqValues,
        flashSize: 'keep' as FlashSizeValues,
        eraseAll: false,
        compress: true,
        reportProgress: (_index, written, total) => {
          setFlashProgress(total > 0 ? 35 + Math.round((written / total) * 50) : 35)
        }
      })
      throwIfStopRequested()

      appendFlashLog('Verifying updated configuration...')
      const writtenNvs = await loader.readFlash(
        UIFLOW2_NVS_OFFSET,
        UIFLOW2_NVS_PARTITION_SIZE,
        (_packet, received, total) => {
          setFlashProgress(total > 0 ? 85 + Math.round((received / total) * 14) : 85)
        }
      )
      throwIfStopRequested()
      verifyUiflow2NvsUpdate(writtenNvs, update)

      await loader.after('hard_reset')
      throwIfStopRequested()
      resetDone = true
      setFlashProgress(100)
      appendFlashLog('Configuration updated successfully.')
      setFlashSucceeded(true)
    } catch (error) {
      if (stopRequestedRef.current || error instanceof FirmwareOperationStoppedError) {
        setFlashProgress(0)
        appendFlashLog(
          writeStarted
            ? 'Configuration update stopped. Run Update Config again before using the changed settings.'
            : 'Configuration update stopped.'
        )
      } else {
        appendFlashLog(
          `Configuration update failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    } finally {
      if (transport && !resetDone && activeTransportRef.current === transport) {
        await disconnectTransport(transport)
      }
      if (activeTransportRef.current === transport) activeTransportRef.current = null
      stopRequestedRef.current = false
      setIsStopping(false)
      setIsWorking(false)
    }
  }

  return (
    <>
      <Modal>
        <Modal.Trigger
          aria-hidden
          tabIndex={-1}
          className="fixed size-0 overflow-hidden opacity-0 pointer-events-none border-0 p-0"
        />
        <ModalBackdrop
          isOpen
          onOpenChange={(open) => {
            if (!open && !isWorking) onClose()
          }}
          isDismissable={!isWorking}
        >
          <ModalContainer size="lg">
            <ModalDialog className="w-[min(760px,calc(100vw-2rem))] max-w-none">
              <Modal.CloseTrigger />
              <ModalHeader>
                <ModalHeading className="text-lg">
                  {mode === 'firmware' ? 'Firmware Flash' : 'Update Device Config'}
                </ModalHeading>
              </ModalHeader>

              <ModalBody className="flex flex-col gap-4 px-2">
                {/* Serial port selector */}
                <div>
                  <label className={FIELD_LABEL_CLASS}>Serial Port</label>
                  <Select
                    value={selectedPortId || null}
                    onOpenChange={(open) => {
                      if (open && !isSelectingPort) {
                        startSerialPortSelection()
                      }
                    }}
                    onChange={(key) => {
                      const id = key ? String(key) : ''
                      setSelectedPortId(id)
                      if (!id) return
                      appendFlashLog(`Port option clicked: ${id}`)
                      if (isSelectingPort) {
                        window.ipc.serial.selectPort(id)
                        return
                      }
                      setSelectedPort(null)
                      void startSerialPortSelection(id)
                    }}
                    isDisabled={isWorking || (isSelectingPort && availablePorts.length === 0)}
                    className="mt-1"
                    variant="secondary"
                  >
                    <SelectTrigger className="border border-[var(--border)] rounded-lg">
                      {isSelectingPort && availablePorts.length === 0 ? (
                        <span className="text-default-400 text-[12px]">Detecting ports...</span>
                      ) : selectedPortId ? (
                        <SelectValue />
                      ) : (
                        <span className="text-default-400 text-[12px]">Select serial port</span>
                      )}
                      <SelectIndicator />
                    </SelectTrigger>
                    <SelectPopover>
                      <ListBox aria-label="Available serial ports">
                        {availablePorts.length === 0 ? (
                          <ListBox.Item id="empty-port">No ports found</ListBox.Item>
                        ) : (
                          availablePorts.map((port) => (
                            <ListBox.Item key={port.portId} id={port.portId}>
                              {port.portName || port.displayName || port.portId}
                            </ListBox.Item>
                          ))
                        )}
                      </ListBox>
                    </SelectPopover>
                  </Select>
                </div>

                {mode === 'firmware' ? (
                  <>
                    <div>
                      <div className="flex min-w-0 items-center justify-between gap-3">
                        <h3 className={`${FIELD_LABEL_CLASS} shrink-0`}>Firmware</h3>
                        <p
                          className="min-w-0 truncate text-[11px] font-medium text-default-500"
                          title={
                            selectedFirmware
                              ? `${selectedFirmware.deviceLabel} ${selectedFirmware.version}`
                              : undefined
                          }
                          aria-live="polite"
                          aria-atomic="true"
                        >
                          {selectedFirmware
                            ? `Selected: ${selectedFirmware.deviceLabel} ${selectedFirmware.version}`
                            : 'No firmware selected'}
                        </p>
                      </div>
                      <div className="mb-2 mt-1 flex min-w-0 items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <label htmlFor="firmware-search" className="sr-only">
                            Search firmware
                          </label>
                          <Input
                            id="firmware-search"
                            type="search"
                            value={firmwareSearch}
                            onChange={(event) => setFirmwareSearch(event.target.value)}
                            placeholder="Search firmware"
                            aria-label="Search firmware"
                            disabled={isWorking}
                            className="h-8 w-full rounded-md border border-[var(--border)] text-[11px]"
                            variant="secondary"
                          />
                        </div>
                        <Tooltip delay={300}>
                          <Tooltip.Trigger className="inline-flex shrink-0">
                            <span className="inline-flex">
                              <button
                                type="button"
                                aria-label="Refresh firmware"
                                onClick={() => void loadRemoteFirmwares()}
                                disabled={isLoadingRemote || isWorking}
                                className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-line bg-surface-2 text-muted transition-colors enabled:cursor-pointer enabled:hover:border-accent enabled:hover:bg-soft enabled:hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <RefreshIcon
                                  size={12}
                                  className={isLoadingRemote ? 'animate-spin' : ''}
                                />
                              </button>
                            </span>
                          </Tooltip.Trigger>
                          <Tooltip.Content placement="top" showArrow>
                            Refresh firmware
                          </Tooltip.Content>
                        </Tooltip>
                      </div>
                      {remoteError ? (
                        <div
                          className="mb-2 flex items-center justify-between gap-2 text-[11px] text-danger"
                          role="alert"
                        >
                          <span>{remoteError}</span>
                          <button
                            type="button"
                            className="shrink-0 text-accent"
                            onClick={() => void loadRemoteFirmwares()}
                            disabled={isLoadingRemote || isWorking}
                          >
                            Retry
                          </button>
                        </div>
                      ) : null}
                      {isLoadingRemote ? (
                        <FirmwareListPlaceholder message="Loading online firmware..." />
                      ) : filteredFirmwares.length > 0 ? (
                        <div className="h-[198px] overflow-y-auto pr-1">
                          <div className="grid auto-rows-[96px] grid-cols-2 gap-1.5 md:grid-cols-5">
                            {filteredFirmwares.map((firmware) => (
                              <FirmwareCard
                                key={firmware.id}
                                firmware={firmware}
                                isSelected={selectedFirmwareId === firmware.id}
                                isDisabled={isWorking}
                                onSelect={() => setSelectedFirmwareId(firmware.id)}
                              />
                            ))}
                          </div>
                        </div>
                      ) : (
                        <FirmwareListPlaceholder
                          message={
                            remoteError
                              ? 'Online firmware is unavailable.'
                              : 'No matching firmware found.'
                          }
                        />
                      )}
                    </div>

                    <TextField className="flex flex-col gap-1">
                      <Label className={FIELD_LABEL_CLASS}>Server</Label>
                      <Input
                        type="text"
                        className="text-[12px] border border-[var(--border)] rounded-lg"
                        placeholder={UIFLOW2_DEFAULT_SERVER}
                        value={server}
                        onChange={(e) => setServer(e.target.value)}
                        disabled={isWorking}
                        variant="secondary"
                      />
                    </TextField>

                    <div className="grid grid-cols-2 gap-3">
                      <TextField className="flex flex-col gap-1">
                        <Label className={FIELD_LABEL_CLASS}>WiFi SSID</Label>
                        <Input
                          type="text"
                          className="text-[12px] border border-[var(--border)] rounded-lg"
                          placeholder="WiFi name"
                          value={wifiSsid}
                          onChange={(e) => setWifiSsid(e.target.value)}
                          disabled={isWorking}
                          variant="secondary"
                        />
                      </TextField>
                      <TextField className="flex flex-col gap-1">
                        <Label className={FIELD_LABEL_CLASS}>Password</Label>
                        <div className="relative">
                          <Input
                            type={isWifiPasswordVisible ? 'text' : 'password'}
                            className="w-full rounded-lg border border-[var(--border)] pr-9 text-[12px]"
                            placeholder="WiFi password"
                            value={wifiPassword}
                            onChange={(e) => setWifiPassword(e.target.value)}
                            disabled={isWorking}
                            variant="secondary"
                          />
                          <PasswordVisibilityButton
                            isVisible={isWifiPasswordVisible}
                            isDisabled={isWorking}
                            onToggle={() => setIsWifiPasswordVisible((visible) => !visible)}
                          />
                        </div>
                      </TextField>
                    </div>
                  </>
                ) : (
                  <>
                    <TextField className="flex flex-col gap-1">
                      <Label className={FIELD_LABEL_CLASS}>Server</Label>
                      <Input
                        type="text"
                        className="text-[12px] border border-[var(--border)] rounded-lg"
                        placeholder="Leave blank to keep current server"
                        value={configServer}
                        onChange={(event) => {
                          setConfigServer(event.target.value)
                          setConfigValidationError('')
                        }}
                        disabled={isWorking}
                        aria-describedby={
                          configValidationError ? 'firmware-config-error' : 'firmware-config-help'
                        }
                        variant="secondary"
                      />
                    </TextField>

                    <div className="grid grid-cols-2 gap-3">
                      <TextField className="flex flex-col gap-1">
                        <Label className={FIELD_LABEL_CLASS}>WiFi SSID</Label>
                        <Input
                          type="text"
                          className="text-[12px] border border-[var(--border)] rounded-lg"
                          placeholder="Leave blank to keep current WiFi"
                          value={configWifiSsid}
                          onChange={(event) => {
                            setConfigWifiSsid(event.target.value)
                            setConfigValidationError('')
                          }}
                          disabled={isWorking}
                          aria-invalid={Boolean(configValidationError)}
                          aria-describedby={
                            configValidationError ? 'firmware-config-error' : 'firmware-config-help'
                          }
                          variant="secondary"
                        />
                      </TextField>
                      <TextField className="flex flex-col gap-1">
                        <Label className={FIELD_LABEL_CLASS}>Password</Label>
                        <div className="relative">
                          <Input
                            type={isConfigWifiPasswordVisible ? 'text' : 'password'}
                            className="w-full rounded-lg border border-[var(--border)] pr-9 text-[12px]"
                            placeholder="Enter with WiFi SSID"
                            value={configWifiPassword}
                            onChange={(event) => {
                              setConfigWifiPassword(event.target.value)
                              setConfigValidationError('')
                            }}
                            disabled={isWorking}
                            aria-invalid={Boolean(configValidationError)}
                            aria-describedby={
                              configValidationError
                                ? 'firmware-config-error'
                                : 'firmware-config-help'
                            }
                            autoComplete="new-password"
                            variant="secondary"
                          />
                          <PasswordVisibilityButton
                            isVisible={isConfigWifiPasswordVisible}
                            isDisabled={isWorking}
                            onToggle={() => setIsConfigWifiPasswordVisible((visible) => !visible)}
                          />
                        </div>
                      </TextField>
                    </div>
                    <div className="min-h-5 text-[11px] leading-5">
                      {configValidationError ? (
                        <span id="firmware-config-error" role="alert" className="text-danger">
                          {configValidationError}
                        </span>
                      ) : (
                        <span id="firmware-config-help" className="text-default-400">
                          Blank fields keep their current values. WiFi SSID and password must be
                          entered together.
                        </span>
                      )}
                    </div>
                  </>
                )}

                {/* Flash progress */}
                <ProgressBar
                  value={flashProgress}
                  minValue={0}
                  maxValue={100}
                  aria-label={
                    mode === 'firmware' ? 'Flash progress' : 'Configuration update progress'
                  }
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <ProgressBar.Output />
                  </div>
                  <ProgressBar.Track>
                    <ProgressBar.Fill />
                  </ProgressBar.Track>
                </ProgressBar>

                {/* Flash log */}
                <div className="flex flex-col gap-1">
                  <span className={FIELD_LABEL_CLASS}>Log</span>
                  <div
                    ref={logContainerRef}
                    className="rounded-lg p-2 font-mono text-[11px] overflow-y-auto bg-default-100 border border-default-200"
                    style={{ height: 150 }}
                  >
                    {flashLogs.length === 0 ? (
                      <span className="text-default-400">No logs yet.</span>
                    ) : (
                      flashLogs.map((line, idx) => (
                        <div key={idx} className="leading-relaxed break-all">
                          {line}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </ModalBody>

              <ModalFooter className="flex justify-between gap-2 px-2">
                <Button
                  variant="outline"
                  isDisabled={isWorking}
                  onPress={() => changeMode(mode === 'firmware' ? 'config' : 'firmware')}
                >
                  {mode === 'firmware' ? 'Update Config' : 'Back to Firmware'}
                </Button>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" isDisabled={isWorking} onPress={onClose}>
                    Cancel
                  </Button>
                  <Button
                    variant={isStopping ? 'danger' : 'primary'}
                    className={
                      isWorking && !isStopping
                        ? 'group min-w-[96px] hover:bg-danger hover:text-danger-foreground focus-visible:bg-danger focus-visible:text-danger-foreground'
                        : undefined
                    }
                    aria-label={
                      isWorking
                        ? isStopping
                          ? 'Stopping firmware operation'
                          : mode === 'firmware'
                            ? 'Stop firmware flash'
                            : 'Stop configuration update'
                        : undefined
                    }
                    isDisabled={
                      isWorking
                        ? isStopping
                        : !flashSucceeded &&
                          (isSelectingPort ||
                            !selectedPort ||
                            (mode === 'firmware' && (isLoadingRemote || !selectedFirmware)))
                    }
                    onPress={() => {
                      if (isWorking) {
                        void handleStop()
                        return
                      }
                      if (flashSucceeded) {
                        onClose()
                        return
                      }
                      if (mode === 'firmware') void handleFlashFirmware()
                      else void handleUpdateConfig()
                    }}
                  >
                    {isWorking ? (
                      isStopping ? (
                        'Stopping...'
                      ) : (
                        <span className="relative inline-flex min-w-[72px] items-center justify-center leading-none">
                          <span className="group-hover:invisible group-focus-visible:invisible">
                            {mode === 'firmware' ? 'Flashing...' : 'Updating...'}
                          </span>
                          <span className="invisible absolute inset-0 flex items-center justify-center group-hover:visible group-focus-visible:visible">
                            {mode === 'firmware' ? 'Stop Flash' : 'Stop Update'}
                          </span>
                        </span>
                      )
                    ) : flashSucceeded ? (
                      'Finished'
                    ) : mode === 'firmware' ? (
                      'Start Flash'
                    ) : (
                      'Update Config'
                    )}
                  </Button>
                </div>
              </ModalFooter>
            </ModalDialog>
          </ModalContainer>
        </ModalBackdrop>
      </Modal>
    </>
  )
}
