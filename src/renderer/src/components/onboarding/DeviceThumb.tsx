import React from 'react'
import { resolveDeviceImage } from '../../utils/device/deviceImage'

export default function DeviceThumb({ type }: { type: string }): React.JSX.Element {
  return (
    <div
      className="flex-shrink-0 flex items-center justify-center rounded-md overflow-hidden"
      style={{
        width: 44,
        height: 44,
        padding: 4,
        backgroundColor: 'var(--device-thumb-bg)',
        border: '1px solid var(--device-thumb-border)'
      }}
    >
      <img
        src={resolveDeviceImage(type)}
        alt={type}
        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
      />
    </div>
  )
}
