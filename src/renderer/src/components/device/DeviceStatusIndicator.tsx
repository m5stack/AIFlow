import React from 'react'
import type { DeviceItem } from '../../types/device'
import { getDeviceStatusPresentation } from '../../utils/device/deviceStatus'

type StatusDevice = Pick<DeviceItem, 'status' | 'invalid'>

interface DeviceStatusIndicatorProps {
  device: StatusDevice
  showLabel?: boolean
  className?: string
}

export default function DeviceStatusIndicator({
  device,
  showLabel = false,
  className = ''
}: DeviceStatusIndicatorProps): React.JSX.Element {
  const status = getDeviceStatusPresentation(device)

  return (
    <span
      className={`inline-flex min-w-0 items-center gap-1 text-[10px] ${className}`}
      title={status.label}
      aria-label={`Device status: ${status.label}`}
    >
      <span
        aria-hidden
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: status.color }}
      />
      {showLabel ? <span className="truncate text-muted">{status.label}</span> : null}
    </span>
  )
}
