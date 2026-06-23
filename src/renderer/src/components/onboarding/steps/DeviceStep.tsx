import React from 'react'
import { Button, Input, TextField } from '@heroui/react'
import { useDeviceStore } from '../../../stores/deviceStore'
import { ZapIcon } from '../../icons/Icons'
import type { DeviceMode } from '../constants'
import DeviceThumb from '../DeviceThumb'

export interface DeviceStepProps {
  deviceMode: DeviceMode
  pairCode: string
  selectedDeviceId: string
  isBusy: boolean
  onDeviceModeChange: (mode: DeviceMode) => void
  onPairCodeChange: (v: string) => void
  onSelectedDeviceIdChange: (id: string) => void
  onFlash: () => void
}

export default function DeviceStep({
  deviceMode,
  pairCode,
  selectedDeviceId,
  isBusy,
  onDeviceModeChange,
  onPairCodeChange,
  onSelectedDeviceIdChange,
  onFlash
}: DeviceStepProps): React.JSX.Element {
  const devices = useDeviceStore((s) => s.devices)
  const pairCodeValid = pairCode.length === 6 && /^\d{6}$/.test(pairCode)
  const hasDevices = devices.length > 0

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-[18px] font-bold text-[var(--text-h)]">Connect M5Stack Device</h2>
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
          Flash the firmware for AIFlow into your M5Stack device,
        </p>
        <p className="text-[11px] leading-relaxed text-muted">
          {' '}
          and connect the device with this computer.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[12px] font-medium text-default-500">Flash AIFlow Firmware</label>
        <div
          className="flex flex-col items-center justify-center gap-2 rounded-lg px-3 py-2.5"
          style={{
            backgroundColor: 'var(--social-bg)',
            border: '1px solid var(--border)'
          }}
        >
          <Button
            variant="primary"
            className="w-[100px] !text-[14px] cursor-pointer flex-shrink-0 gap-3"
            onPress={onFlash}
            isDisabled={isBusy}
          >
            <ZapIcon size={13} />
            Flash
          </Button>
          <p className="text-[11px] text-muted  leading-relaxed">
            If your M5Stack device is already displaying the 6-digit access code, you can skip
            flashing and directly input it underneath.
          </p>
        </div>
      </div>

      {hasDevices && (
        <div
          className="flex rounded-lg p-0.5 gap-0.5"
          style={{
            backgroundColor: 'var(--social-bg)',
            border: '1px solid var(--border)'
          }}
        >
          {(['select', 'pair'] as DeviceMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onDeviceModeChange(mode)}
              className="flex-1 py-1.5 rounded-md text-[12px] font-medium transition-colors cursor-pointer"
              style={{
                backgroundColor: deviceMode === mode ? 'var(--accent)' : 'transparent',
                color: deviceMode === mode ? '#fff' : 'var(--text)',
                boxShadow: deviceMode === mode ? 'var(--shadow)' : 'none'
              }}
            >
              {mode === 'select' ? 'Select Device' : 'Pair New Device'}
            </button>
          ))}
        </div>
      )}

      {deviceMode === 'select' && hasDevices ? (
        <div
          className="flex flex-col rounded-lg overflow-hidden"
          style={{ border: '1px solid var(--border)' }}
        >
          {devices.map((d) => {
            const isSelected = selectedDeviceId === d.id
            return (
              <button
                key={d.id}
                type="button"
                className="flex items-center gap-3 px-3 py-2.5 transition-colors cursor-pointer text-left"
                style={{
                  borderBottom: '1px solid var(--border)',
                  backgroundColor: isSelected
                    ? 'var(--device-card-active-bg)'
                    : 'var(--device-card-bg)'
                }}
                onClick={() => onSelectedDeviceIdChange(d.id)}
                disabled={isBusy}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    border: isSelected ? '5px solid var(--accent)' : '2px solid var(--border)',
                    backgroundColor: 'transparent',
                    flexShrink: 0
                  }}
                />
                <DeviceThumb type={d.type} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-[var(--text-h)] truncate">
                    {d.name || d.type}
                  </div>
                  <div className="text-[11px] text-muted truncate">{d.type}</div>
                </div>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-medium text-default-500">Input the Access Code</label>
          <TextField
            value={pairCode}
            onChange={(v) => onPairCodeChange(v.replace(/\D/g, '').slice(0, 6))}
          >
            <Input
              placeholder="000000"
              className="min-h-14 border border-[var(--border)] rounded-lg"
              style={{
                fontSize: 28,
                lineHeight: 1,
                letterSpacing: '0.35em',
                textAlign: 'center',
                fontFamily: 'ui-monospace, monospace',
                paddingTop: 12,
                paddingBottom: 12
              }}
              maxLength={6}
              disabled={isBusy}
            />
          </TextField>
          <p className="text-[11px] text-muted">
            The 6-digit access code displayed on the device screen.
          </p>
          {pairCode.length > 0 && !pairCodeValid && (
            <p className="text-[11px]" style={{ color: '#f85149' }}>
              Access code must be exactly 6 digits.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
