import React from 'react'
import { Input, TextField } from '@heroui/react'

export interface ProjectStepProps {
  projectName: string
  modelLabel: string
  deviceName: string
  deviceType: string
  isBusy: boolean
  onProjectNameChange: (v: string) => void
}

export default function ProjectStep({
  projectName,
  modelLabel,
  deviceName,
  deviceType,
  isBusy,
  onProjectNameChange
}: ProjectStepProps): React.JSX.Element {
  const showDeviceType =
    deviceType.length > 0 && deviceType !== deviceName && deviceName !== '—'

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-[18px] font-bold text-[var(--text-h)]">Start Using</h2>
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
          Great! The preparation is finished. Let&apos;s create a project and start coding with
          natural language!
        </p>
      </div>

      <div
        className="flex flex-col gap-2.5 rounded-lg px-3 py-3"
        style={{
          backgroundColor: 'var(--social-bg)',
          border: '1px solid var(--border)'
        }}
      >
        <span className="text-[11px] font-medium text-default-500">Your setup</span>
        <div className="flex items-center justify-between gap-3 text-[12px]">
          <span className="text-muted shrink-0">Model</span>
          <span className="font-medium text-[var(--text-h)] truncate">{modelLabel || '—'}</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-[12px]">
          <span className="text-muted shrink-0">Device</span>
          <div className="min-w-0 text-right">
            <div className="font-medium text-[var(--text-h)] truncate">{deviceName || '—'}</div>
            {showDeviceType && (
              <div className="text-[10px] text-muted truncate">{deviceType}</div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[12px] font-medium text-default-500">Project Name</label>
        <TextField value={projectName} onChange={onProjectNameChange}>
          <Input
            placeholder="My Project"
            className="border border-[var(--border)] rounded-lg text-[13px]"
            disabled={isBusy}
          />
        </TextField>
        <p className="text-[11px] text-muted leading-relaxed">
          You can rename the project later from the project switcher in the top bar.
        </p>
      </div>
    </div>
  )
}
