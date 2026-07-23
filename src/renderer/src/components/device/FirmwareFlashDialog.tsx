import React, { useCallback, useEffect, useRef, useState } from 'react'
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
  ListBox,
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalContainer,
  ModalDialog,
  ModalFooter,
  ModalHeader,
  ModalHeading,
  ProgressBar,
  Select,
  SelectIndicator,
  SelectPopover,
  SelectTrigger,
  SelectValue,
  TextField
} from '@heroui/react'
import {
  BUNDLED_FIRMWARES,
  DEFAULT_BUNDLED_FIRMWARE_ID,
  getBundledFirmwareEntry
} from '../../../../shared/bundledFirmware'
import {
  generateUpdatedUiflow2NvsBin,
  generateUiflow2NvsBin,
  mixinNvsIntoFirmware,
  UIFLOW2_DEFAULT_SERVER,
  UIFLOW2_NVS_DEFAULTS,
  UIFLOW2_NVS_OFFSET,
  UIFLOW2_OFFICIAL_SERVER,
  UIFLOW2_NVS_PARTITION_SIZE,
  verifyUiflow2NvsUpdate,
  type Uiflow2NvsUpdate
} from '../../utils/device/uiflow2Nvs'

const CONNECT_TIMEOUT_MS = 30000
const DISCONNECT_TIMEOUT_MS = 5000

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
}

interface OfficialServerShortcutProps {
  isDisabled: boolean
  onSelect: () => void
}

function OfficialServerShortcut({
  isDisabled,
  onSelect
}: OfficialServerShortcutProps): React.JSX.Element {
  return (
    <div className="text-[10px] text-muted opacity-70">
      Official server:{' '}
      <button
        type="button"
        disabled={isDisabled}
        onClick={onSelect}
        className="cursor-pointer rounded-sm text-accent transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        {UIFLOW2_OFFICIAL_SERVER}
      </button>
    </div>
  )
}

export default function FirmwareFlashDialog({
  isOpen,
  onClose
}: FirmwareFlashDialogProps): React.JSX.Element | null {
  if (!isOpen) return null
  return <FirmwareFlashDialogContent onClose={onClose} />
}

function FirmwareFlashDialogContent({
  onClose
}: Pick<FirmwareFlashDialogProps, 'onClose'>): React.JSX.Element {
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
  const [selectedFirmwareId, setSelectedFirmwareId] = useState(DEFAULT_BUNDLED_FIRMWARE_ID)
  const [server, setServer] = useState(UIFLOW2_DEFAULT_SERVER)
  const [wifiSsid, setWifiSsid] = useState('')
  const [wifiPassword, setWifiPassword] = useState('')
  const [configServer, setConfigServer] = useState('')
  const [configWifiSsid, setConfigWifiSsid] = useState('')
  const [configWifiPassword, setConfigWifiPassword] = useState('')
  const [configValidationError, setConfigValidationError] = useState('')
  const preferredPortIdRef = useRef('')
  const logContainerRef = useRef<HTMLDivElement>(null)
  const activeTransportRef = useRef<Transport | null>(null)
  const stopRequestedRef = useRef(false)

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [flashLogs])

  const selectedFirmware = getBundledFirmwareEntry(selectedFirmwareId) ?? BUNDLED_FIRMWARES[0]

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

    stopRequestedRef.current = false
    setIsStopping(false)
    setIsWorking(true)
    setFlashSucceeded(false)
    setFlashProgress(0)
    appendFlashLog('Port ready. Loading bundled firmware...')

    let transport: Transport | null = null
    let resetDone = false
    let writeStarted = false
    try {
      const binary = await window.ipc.firmware.readBundled(selectedFirmware.fileName)
      throwIfStopRequested()
      appendFlashLog(`Bundled firmware loaded: ${selectedFirmware.label}.`)

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
            <ModalDialog>
              <Modal.CloseTrigger />
              <ModalHeader>
                <ModalHeading className="text-lg">
                  {mode === 'firmware' ? 'Firmware Flash' : 'Update Device Config'}
                </ModalHeading>
              </ModalHeader>

              <ModalBody className="flex flex-col gap-4 px-2">
                {/* Serial port selector */}
                <div>
                  <label className="text-[12px] text-default-500">Serial Port</label>
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
                      <label className="text-[12px] text-default-500">Firmware</label>
                      <Select
                        value={selectedFirmwareId}
                        onChange={(key) => {
                          const id = key ? String(key) : ''
                          if (id) setSelectedFirmwareId(id)
                        }}
                        isDisabled={isWorking}
                        className="mt-1"
                        variant="secondary"
                      >
                        <SelectTrigger className="border border-[var(--border)] rounded-lg">
                          <SelectValue />
                          <SelectIndicator />
                        </SelectTrigger>
                        <SelectPopover>
                          <ListBox aria-label="Available firmware">
                            {BUNDLED_FIRMWARES.map((item) => (
                              <ListBox.Item key={item.id} id={item.id} textValue={item.label}>
                                {item.label}
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </SelectPopover>
                      </Select>
                    </div>

                    <TextField className="flex flex-col gap-1">
                      <Label className="text-[12px] text-default-500">Server</Label>
                      <Input
                        type="text"
                        className="text-[12px] border border-[var(--border)] rounded-lg"
                        placeholder={UIFLOW2_DEFAULT_SERVER}
                        value={server}
                        onChange={(e) => setServer(e.target.value)}
                        disabled={isWorking}
                        variant="secondary"
                      />
                      <OfficialServerShortcut
                        isDisabled={isWorking}
                        onSelect={() => setServer(UIFLOW2_OFFICIAL_SERVER)}
                      />
                    </TextField>

                    <div className="grid grid-cols-2 gap-3">
                      <TextField className="flex flex-col gap-1">
                        <Label className="text-[12px] text-default-500">WiFi SSID</Label>
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
                        <Label className="text-[12px] text-default-500">Password</Label>
                        <Input
                          type="password"
                          className="text-[12px] border border-[var(--border)] rounded-lg"
                          placeholder="WiFi password"
                          value={wifiPassword}
                          onChange={(e) => setWifiPassword(e.target.value)}
                          disabled={isWorking}
                          variant="secondary"
                        />
                      </TextField>
                    </div>
                  </>
                ) : (
                  <>
                    <TextField className="flex flex-col gap-1">
                      <Label className="text-[12px] text-default-500">Server</Label>
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
                      <OfficialServerShortcut
                        isDisabled={isWorking}
                        onSelect={() => {
                          setConfigServer(UIFLOW2_OFFICIAL_SERVER)
                          setConfigValidationError('')
                        }}
                      />
                    </TextField>

                    <div className="grid grid-cols-2 gap-3">
                      <TextField className="flex flex-col gap-1">
                        <Label className="text-[12px] text-default-500">WiFi SSID</Label>
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
                        <Label className="text-[12px] text-default-500">Password</Label>
                        <Input
                          type="password"
                          className="text-[12px] border border-[var(--border)] rounded-lg"
                          placeholder="Enter with WiFi SSID"
                          value={configWifiPassword}
                          onChange={(event) => {
                            setConfigWifiPassword(event.target.value)
                            setConfigValidationError('')
                          }}
                          disabled={isWorking}
                          aria-invalid={Boolean(configValidationError)}
                          aria-describedby={
                            configValidationError ? 'firmware-config-error' : 'firmware-config-help'
                          }
                          autoComplete="new-password"
                          variant="secondary"
                        />
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
                  <span className="text-[12px] text-default-500">Log</span>
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
                      isWorking ? isStopping : !flashSucceeded && (isSelectingPort || !selectedPort)
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
