import React, { useEffect, useRef, useState } from 'react'
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
  generateUiflow2NvsBin,
  mixinNvsIntoFirmware,
  UIFLOW2_DEFAULT_SERVER,
  UIFLOW2_NVS_DEFAULTS
} from '../../utils/device/uiflow2Nvs'


interface SerialPortInfo {
  portId: string
  portName: string
  displayName?: string
  manufacturerName?: string
  vendorId?: string
  productId?: string
}

interface FirmwareFlashDialogProps {
  isOpen: boolean
  onClose: () => void
}

export default function FirmwareFlashDialog({
  isOpen,
  onClose
}: FirmwareFlashDialogProps): React.JSX.Element | null {
  const [isFlashing, setIsFlashing] = useState(false)
  const [isSelectingPort, setIsSelectingPort] = useState(false)
  const [flashProgress, setFlashProgress] = useState(0)
  const [flashLogs, setFlashLogs] = useState<string[]>([])
  const [availablePorts, setAvailablePorts] = useState<SerialPortInfo[]>([])
  const [selectedPortId, setSelectedPortId] = useState('')
  const [selectedPort, setSelectedPort] = useState<any>(null)
  const [serialListenerReady, setSerialListenerReady] = useState(false)
  const [selectedFirmwareId, setSelectedFirmwareId] = useState(DEFAULT_BUNDLED_FIRMWARE_ID)
  const [server, setServer] = useState(UIFLOW2_DEFAULT_SERVER)
  const [wifiSsid, setWifiSsid] = useState('')
  const [wifiPassword, setWifiPassword] = useState('')
  const preferredPortIdRef = useRef('')
  const logContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [flashLogs])

  const selectedFirmware = getBundledFirmwareEntry(selectedFirmwareId) ?? BUNDLED_FIRMWARES[0]

  useEffect(() => {
    if (!isOpen) return

    setFlashLogs([])
    setFlashProgress(0)
    setSelectedPort(null)
    setSelectedFirmwareId(DEFAULT_BUNDLED_FIRMWARE_ID)
    setServer(UIFLOW2_DEFAULT_SERVER)
  }, [isOpen])

  // Register serial port list IPC listener only while this dialog is open.
  useEffect(() => {
    const serialApi = window.ipc?.serial
    if (!serialApi || !isOpen) {
      setSerialListenerReady(false)
      return
    }

    setSerialListenerReady(true)
    const offPortList = serialApi.onPortList((ports) => {
      setAvailablePorts(ports)
      setSelectedPortId((prev) => {
        const preferredPortId = preferredPortIdRef.current
        const preferredExists = preferredPortId && ports.some((p) => p.portId === preferredPortId)
        const keepPrev = prev && ports.some((p) => p.portId === prev)
        const targetPortId = preferredExists
          ? preferredPortId
          : keepPrev
            ? prev
            : (ports[0]?.portId ?? '')
        if (targetPortId) {
          // Keep UI selection and Electron requestPort callback in sync.
          window.ipc.serial.selectPort(targetPortId)
        }
        return targetPortId
      })
    })
    return () => {
      setSerialListenerReady(false)
      offPortList()
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !serialListenerReady) return
    startSerialPortSelection()
  }, [isOpen, serialListenerReady])

  const appendFlashLog = (line: string) => {
    const content = line.trim()
    if (!content) return
    const now = new Date().toLocaleTimeString('en-GB', { hour12: false })
    setFlashLogs((prev) => [...prev, `${now} ${content}`])
  }

  const startSerialPortSelection = async (preferredPortId?: string): Promise<void> => {
    const serialApi = (navigator as Navigator & { serial?: { requestPort: () => Promise<any> } })
      .serial
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
      appendFlashLog(`❌ Port selection failed: ${msg}`)
      appendFlashLog('Make sure device is connected via USB and try again.')
    } finally {
      preferredPortIdRef.current = ''
      setIsSelectingPort(false)
    }
  }

  const handleFlashFirmware = async (): Promise<void> => {
    if (!selectedPort) {
      appendFlashLog('Please select a serial port first.')
      return
    }

    setIsFlashing(true)
    setFlashProgress(0)
    appendFlashLog('Port ready. Loading bundled firmware...')

    let transport: Transport | null = null
    let resetDone = false
    try {
      const binary = await window.ipc.firmware.readBundled(selectedFirmware.fileName)
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
      const firmwareWithNvs = new Uint8Array(mixinNvsIntoFirmware(binary, nvsBin))
      appendFlashLog('NVS config merged into firmware image.')

      transport = new Transport(selectedPort, true)

      const terminal: IEspLoaderTerminal = {
        clean: () => undefined,
        write: (data: string) => appendFlashLog(data),
        writeLine: (data: string) => appendFlashLog(data)
      }

      const loader = new ESPLoader({ transport, baudrate: 115200, terminal, debugLogging: false })

      appendFlashLog('Connecting to device bootloader...')
      await loader.main('default_reset')

      appendFlashLog('Writing flash, please wait...')
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

      await loader.after('hard_reset')
      resetDone = true
      setFlashProgress(100)
      appendFlashLog('Flash completed successfully.')
    } catch (error) {
      appendFlashLog(`Flash failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      if (transport && !resetDone) {
        try {
          await transport.disconnect()
        } catch {
          /* already closed */
        }
      }
      setIsFlashing(false)
    }
  }

  if (!isOpen) return null

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
            if (!open && !isFlashing) onClose()
          }}
          isDismissable={!isFlashing}
        >
          <ModalContainer size="lg">
            <ModalDialog>
              <Modal.CloseTrigger />
              <ModalHeader>
                <ModalHeading className="text-lg">Firmware Flash</ModalHeading>
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
                    isDisabled={isFlashing || (isSelectingPort && availablePorts.length === 0)}
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
                      <ListBox>
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

                {/* Bundled firmware */}
                <div>
                  <label className="text-[12px] text-default-500">Firmware</label>
                  <Select
                    value={selectedFirmwareId}
                    onChange={(key) => {
                      const id = key ? String(key) : ''
                      if (id) setSelectedFirmwareId(id)
                    }}
                    isDisabled={isFlashing}
                    className="mt-1"
                    variant="secondary"
                  >
                    <SelectTrigger className="border border-[var(--border)] rounded-lg">
                      <SelectValue />
                      <SelectIndicator />
                    </SelectTrigger>
                    <SelectPopover>
                      <ListBox>
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
                  <label className="text-[12px] text-default-500">Server</label>
                  <Input
                    type="text"
                    className="text-[12px] border border-[var(--border)] rounded-lg"
                    placeholder={UIFLOW2_DEFAULT_SERVER}
                    value={server}
                    onChange={(e) => setServer(e.target.value)}
                    disabled={isFlashing}
                    variant="secondary"
                  />
                </TextField>

                {/* WiFi config */}
                <div className="grid grid-cols-2 gap-3">
                  <TextField className="flex flex-col gap-1">
                    <label className="text-[12px] text-default-500">WiFi SSID</label>
                    <Input
                      type="text"
                      className="text-[12px] border border-[var(--border)] rounded-lg"
                      placeholder="WiFi name"
                      value={wifiSsid}
                      onChange={(e) => setWifiSsid(e.target.value)}
                      disabled={isFlashing}
                      variant="secondary"
                    />
                  </TextField>
                  <TextField className="flex flex-col gap-1">
                    <label className="text-[12px] text-default-500">Password</label>
                    <Input
                      type="password"
                      className="text-[12px] border border-[var(--border)] rounded-lg"
                      placeholder="WiFi password"
                      value={wifiPassword}
                      onChange={(e) => setWifiPassword(e.target.value)}
                      disabled={isFlashing}
                      variant="secondary"
                    />
                  </TextField>
                </div>

                {/* Flash progress */}
                <ProgressBar
                  value={flashProgress}
                  minValue={0}
                  maxValue={100}
                  aria-label="Flash progress"
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

              <ModalFooter>
                <Button variant="outline" isDisabled={isFlashing} onPress={onClose}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  isDisabled={isFlashing || isSelectingPort || !selectedPort}
                  onPress={() => {
                    handleFlashFirmware()
                  }}
                >
                  {isFlashing ? 'Flashing...' : 'Start Flash'}
                </Button>
              </ModalFooter>
            </ModalDialog>
          </ModalContainer>
        </ModalBackdrop>
      </Modal>
    </>
  )
}
