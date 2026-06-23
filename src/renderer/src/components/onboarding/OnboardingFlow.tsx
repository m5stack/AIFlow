import React, { useEffect, useState } from 'react'
import {
  Button,
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalContainer,
  ModalDialog,
  ModalFooter,
  toast
} from '@heroui/react'
import type { ModelConnectionTestResult } from '../../../../shared/types'
import { bindDevice } from '../../api/device'
import { useClientIdStore } from '../../stores/clientIdStore'
import { useDeviceStore } from '../../stores/deviceStore'
import { useOnboardingStore, type OnboardingStep } from '../../stores/onboardingStore'
import { useProjectStore } from '../../stores/projectStore'
import { DEFAULT_PROJECT_CODE } from '../../utils/project/defaultProjectCode'
import { FirmwareFlashDialog } from '../device'
import { ChevronLeftIcon, ChevronRightIcon } from '../icons/Icons'
import { DEFAULT_CUSTOM_MODEL_ID, type DeviceMode } from './constants'
import StepIndicator from './StepIndicator'
import ApiKeyStep from './steps/ApiKeyStep'
import DeviceStep from './steps/DeviceStep'
import ProjectStep from './steps/ProjectStep'
import WelcomeStep from './steps/WelcomeStep'

export default function OnboardingFlow(): React.JSX.Element {
  const isOpen = useOnboardingStore((s) => s.isOpen)
  const step = useOnboardingStore((s) => s.step)
  const setStep = useOnboardingStore((s) => s.setStep)
  const close = useOnboardingStore((s) => s.close)
  const complete = useOnboardingStore((s) => s.complete)

  const createProject = useProjectStore((s) => s.createProject)
  const devices = useDeviceStore((s) => s.devices)
  const clientId = useClientIdStore((s) => s.clientId)
  const fetchDevices = useDeviceStore((s) => s.fetchDevices)

  const [displayName, setDisplayName] = useState('')
  const [modelId, setModelId] = useState(DEFAULT_CUSTOM_MODEL_ID)
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [hasExistingModels, setHasExistingModels] = useState(false)
  const [configuredModelLabel, setConfiguredModelLabel] = useState('')

  const [deviceMode, setDeviceMode] = useState<DeviceMode>('pair')
  const [pairCode, setPairCode] = useState('')
  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const [resolvedDeviceId, setResolvedDeviceId] = useState('')

  const [projectName, setProjectName] = useState('My Project')
  const [showFlashDialog, setShowFlashDialog] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<ModelConnectionTestResult | null>(null)

  useEffect(() => {
    if (!isOpen) return

    setDisplayName('')
    setModelId(DEFAULT_CUSTOM_MODEL_ID)
    setApiKey('')
    setBaseUrl('')
    setPairCode('')
    setResolvedDeviceId('')
    setConfiguredModelLabel('')
    setProjectName('My Project')
    setShowFlashDialog(false)
    setIsBusy(false)
    setIsTesting(false)
    setTestResult(null)

    void fetchDevices()
    void window.ipc.model.list().then((models) => {
      setHasExistingModels(models.length > 0)
      if (models[0]) setConfiguredModelLabel(models[0].label)
    })
  }, [isOpen, fetchDevices])

  useEffect(() => {
    if (!isOpen) return
    const currentDevices = useDeviceStore.getState().devices
    if (currentDevices.length > 0) {
      setDeviceMode('select')
      setSelectedDeviceId(currentDevices[0]?.id ?? '')
    } else {
      setDeviceMode('pair')
      setSelectedDeviceId('')
    }
  }, [isOpen, devices.length])

  useEffect(() => {
    if (!isOpen || step !== 1) return
    setTestResult(null)
  }, [isOpen, step, displayName, modelId, apiKey, baseUrl])

  const handleClose = (): void => {
    if (isBusy) return
    close()
  }

  const pairCodeValid = pairCode.length === 6 && /^\d{6}$/.test(pairCode)
  const canProceedStep1 =
    !isBusy &&
    (hasExistingModels ||
      (displayName.trim().length > 0 && modelId.trim().length > 0 && apiKey.trim().length > 0))
  const canProceedStep2 =
    !isBusy &&
    (resolvedDeviceId.length > 0 ||
      (deviceMode === 'select' && !!selectedDeviceId) ||
      (deviceMode === 'pair' && pairCodeValid))
  const canProceedStep3 = !isBusy && projectName.trim().length > 0

  const handleTestConnection = async (): Promise<void> => {
    const trimmedModelId = modelId.trim()
    const trimmedApiKey = apiKey.trim()
    if (!trimmedModelId) {
      setTestResult({ ok: false, message: 'Model ID is required.' })
      return
    }
    if (!trimmedApiKey) {
      setTestResult({ ok: false, message: 'API key is required.' })
      return
    }

    setIsTesting(true)
    setTestResult(null)
    try {
      const result = await window.ipc.model.test({
        model: trimmedModelId,
        apiKey: trimmedApiKey,
        baseUrl: baseUrl.trim() || undefined
      })
      setTestResult(result)
    } catch (error) {
      setTestResult({
        ok: false,
        message: error instanceof Error ? error.message : 'Connection test failed.'
      })
    } finally {
      setIsTesting(false)
    }
  }

  const handleStep1Next = async (): Promise<void> => {
    if (!canProceedStep1) return

    if (hasExistingModels && !displayName.trim() && !apiKey.trim()) {
      setStep(2)
      return
    }

    setIsBusy(true)
    try {
      await window.ipc.model.create({
        label: displayName.trim(),
        model: modelId.trim(),
        apiKey: apiKey.trim(),
        baseUrl: baseUrl.trim() || undefined,
        disableNonessentialTraffic: true
      })
      setConfiguredModelLabel(displayName.trim())
      toast.success('Model configured.')
      setStep(2)
    } catch (error) {
      toast.danger(
        `Failed to save model: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    } finally {
      setIsBusy(false)
    }
  }

  const handleStep2Next = async (): Promise<void> => {
    if (!canProceedStep2) return

    if (deviceMode === 'select' && selectedDeviceId) {
      setResolvedDeviceId(selectedDeviceId)
      setStep(3)
      return
    }

    if (resolvedDeviceId) {
      setStep(3)
      return
    }

    if (!pairCodeValid) return

    setIsBusy(true)
    try {
      const device = await bindDevice({
        name: '',
        pairCode,
        tempId: clientId
      })
      await fetchDevices()
      setResolvedDeviceId(device.id)
      toast.success(`Device "${device.name || device.type}" connected.`)
      setStep(3)
    } catch (error) {
      toast.danger(
        `Pair device failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    } finally {
      setIsBusy(false)
    }
  }

  const handleStep3Start = async (): Promise<void> => {
    if (!canProceedStep3) return

    const activeDeviceId = resolvedDeviceId || selectedDeviceId
    if (!activeDeviceId) {
      toast.danger('Please connect or select a device first.')
      return
    }

    setIsBusy(true)
    try {
      const success = await createProject({
        projectName: projectName.trim(),
        activeDeviceId,
        code: DEFAULT_PROJECT_CODE
      })
      if (success) complete()
    } finally {
      setIsBusy(false)
    }
  }

  const handlePrev = (): void => {
    if (step > 0) setStep((step - 1) as OnboardingStep)
  }

  const handleNext = (): void => {
    if (step === 1) void handleStep1Next()
    else if (step === 2) void handleStep2Next()
    else if (step === 3) void handleStep3Start()
  }

  const recapDeviceId = resolvedDeviceId || selectedDeviceId
  const recapDevice = devices.find((d) => d.id === recapDeviceId)
  const deviceName = recapDevice ? recapDevice.name || recapDevice.type : '—'
  const deviceType = recapDevice?.type ?? ''
  const modelLabel = configuredModelLabel || displayName.trim() || '—'

  return (
    <>
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
            <ModalDialog style={{ width: 520, maxWidth: '94vw' }}>
              <Modal.CloseTrigger />
              <ModalBody className="flex flex-col gap-4 p-4" style={{ minHeight: 360 }}>
                {step > 0 && <StepIndicator step={step} />}

                <div className="flex flex-1 flex-col min-h-0">
                  {step === 0 && <WelcomeStep onGetStarted={() => setStep(1)} />}

                  {step === 1 && (
                    <ApiKeyStep
                      displayName={displayName}
                      modelId={modelId}
                      apiKey={apiKey}
                      baseUrl={baseUrl}
                      hasExistingModels={hasExistingModels}
                      isBusy={isBusy || isTesting}
                      isTesting={isTesting}
                      testResult={testResult}
                      onDisplayNameChange={setDisplayName}
                      onModelIdChange={setModelId}
                      onApiKeyChange={setApiKey}
                      onBaseUrlChange={setBaseUrl}
                      onTest={handleTestConnection}
                    />
                  )}

                  {step === 2 && (
                    <DeviceStep
                      deviceMode={deviceMode}
                      pairCode={pairCode}
                      selectedDeviceId={selectedDeviceId}
                      isBusy={isBusy}
                      onDeviceModeChange={setDeviceMode}
                      onPairCodeChange={setPairCode}
                      onSelectedDeviceIdChange={setSelectedDeviceId}
                      onFlash={() => setShowFlashDialog(true)}
                    />
                  )}

                  {step === 3 && (
                    <ProjectStep
                      projectName={projectName}
                      modelLabel={modelLabel}
                      deviceName={deviceName}
                      deviceType={deviceType}
                      isBusy={isBusy}
                      onProjectNameChange={setProjectName}
                    />
                  )}
                </div>
              </ModalBody>

              {step > 0 && (
                <ModalFooter className="flex justify-between gap-2 px-4">
                  <Button
                    variant="primary"
                    className="text-[13px] cursor-pointer gap-1"
                    onPress={handlePrev}
                    isDisabled={isBusy}
                  >
                    <ChevronLeftIcon size={12} />
                    Prev
                  </Button>

                  <Button
                    variant="primary"
                    className="text-[13px] cursor-pointer gap-1"
                    onPress={handleNext}
                    isDisabled={
                      isBusy ||
                      isTesting ||
                      (step === 1 && !canProceedStep1) ||
                      (step === 2 && !canProceedStep2) ||
                      (step === 3 && !canProceedStep3)
                    }
                  >
                    {isBusy ? 'Please wait...' : step === 3 ? 'Start' : 'Next'}
                    {step < 3 && <ChevronRightIcon size={12} />}
                  </Button>
                </ModalFooter>
              )}
            </ModalDialog>
          </ModalContainer>
        </ModalBackdrop>
      </Modal>

      <FirmwareFlashDialog isOpen={showFlashDialog} onClose={() => setShowFlashDialog(false)} />
    </>
  )
}
