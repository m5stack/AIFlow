import React from 'react'
import type { DeviceItem } from '../../types/device'
import { resolveDeviceImage } from '../../utils/device/deviceImage'
import DeviceStatusIndicator from './DeviceStatusIndicator'

interface DeviceCardContentProps {
  device: DeviceItem
  compact?: boolean
  nameContent?: React.ReactNode
  thumbnailOverlay?: React.ReactNode
  thumbnailClassName?: string
  className?: string
}

export default function DeviceCardContent({
  device,
  compact = false,
  nameContent,
  thumbnailOverlay,
  thumbnailClassName = '',
  className = ''
}: DeviceCardContentProps): React.JSX.Element {
  const displayName = device.name || device.type

  return (
    <div
      className={`flex min-w-0 flex-1 items-center justify-center ${compact ? 'gap-2' : 'gap-3'} ${className}`}
    >
      <div
        className={`relative flex shrink-0 items-center justify-center overflow-visible ${
          compact ? 'size-[42px] rounded-lg p-1' : 'size-14 rounded-xl p-1.5'
        } ${thumbnailClassName}`}
        style={
          compact
            ? { backgroundColor: 'rgba(5, 7, 10, 0.06)' }
            : {
                backgroundColor: 'var(--device-thumb-bg)',
                border: '1px solid var(--device-thumb-border)'
              }
        }
      >
        <DeviceStatusIndicator
          device={device}
          className={`pointer-events-none absolute left-0 top-0 rounded-full border-[1.5px] ${
            compact
              ? 'border-[var(--flow-node-bg)] bg-[var(--flow-node-bg)]'
              : 'border-[var(--device-thumb-bg)] bg-[var(--device-thumb-bg)]'
          }`}
        />
        <div className={`size-full overflow-hidden ${compact ? 'rounded-md' : 'rounded-lg'}`}>
          <img
            src={resolveDeviceImage(device.type)}
            alt=""
            className="block size-full object-contain"
          />
        </div>
        {thumbnailOverlay}
      </div>

      <div
        className={`flex min-w-0 flex-col items-center text-center ${
          compact ? 'flex-[0_1_112px]' : 'flex-1'
        }`}
      >
        <div className={`${compact ? 'mb-0.5' : 'mb-1.5'} flex min-w-0 w-full justify-center`}>
          {nameContent ?? (
            <span className="min-w-0 truncate text-[13px] font-semibold leading-none text-[var(--text-h)]">
              {displayName}
            </span>
          )}
        </div>
        <div
          className={`flex min-w-0 w-full max-w-full flex-col items-center ${compact ? 'gap-0.5' : 'gap-1'}`}
        >
          <span
            className="min-w-0 max-w-full truncate rounded px-1.5 py-0.5 font-mono text-[10px] leading-none"
            style={{
              backgroundColor: 'var(--accent-bg)',
              color: 'var(--accent)'
            }}
          >
            {device.type}
          </span>
          <DeviceStatusIndicator device={device} showLabel />
        </div>
      </div>
    </div>
  )
}
