import React from 'react'
import { Input, TextField } from '@heroui/react'
import FieldExampleHints from '../../model/FieldExampleHints'
import { BASE_URL_EXAMPLES, MODEL_ID_EXAMPLES } from '../../../utils/model/modelFieldExamples'
import { DEFAULT_CUSTOM_MODEL_ID } from '../constants'

export interface ApiKeyStepProps {
  displayName: string
  modelId: string
  apiKey: string
  baseUrl: string
  hasExistingModels: boolean
  isBusy: boolean
  onDisplayNameChange: (v: string) => void
  onModelIdChange: (v: string) => void
  onApiKeyChange: (v: string) => void
  onBaseUrlChange: (v: string) => void
}

export default function ApiKeyStep({
  displayName,
  modelId,
  apiKey,
  baseUrl,
  hasExistingModels,
  isBusy,
  onDisplayNameChange,
  onModelIdChange,
  onApiKeyChange,
  onBaseUrlChange
}: ApiKeyStepProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-[18px] font-bold text-[var(--text-h)]">Input API Key</h2>
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
          Supports Anthropic and compatible APIs (e.g. DeepSeek). OpenAI and compatible APIs are
          not supported.
        </p>
      </div>

      {hasExistingModels && (
        <p className="text-[11px] text-accent bg-accent-bg rounded-lg px-3 py-2">
          You already have a model configured. You can update the fields below or proceed with
          Next.
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-[12px] font-medium text-default-500">Customized Display Name</label>
        <TextField value={displayName} onChange={onDisplayNameChange}>
          <Input
            className="border border-[var(--border)] rounded-lg text-[12px]"
            disabled={isBusy}
          />
        </TextField>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[12px] font-medium text-default-500">Model</label>
        <TextField value={modelId} onChange={onModelIdChange}>
          <Input
            placeholder={DEFAULT_CUSTOM_MODEL_ID}
            className="border border-[var(--border)] rounded-lg text-[12px]"
            disabled={isBusy}
          />
        </TextField>
        <FieldExampleHints
          examples={MODEL_ID_EXAMPLES}
          onSelect={onModelIdChange}
          disabled={isBusy}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[12px] font-medium text-default-500">API Key</label>
        <TextField value={apiKey} onChange={onApiKeyChange}>
          <Input
            type="password"
            placeholder="sk-..."
            className="border border-[var(--border)] rounded-lg text-[12px]"
            disabled={isBusy}
          />
        </TextField>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[12px] font-medium text-default-500">Base URL (Optional)</label>
        <TextField value={baseUrl} onChange={onBaseUrlChange}>
          <Input
            className="border border-[var(--border)] rounded-lg text-[12px]"
            disabled={isBusy}
          />
        </TextField>
        <p className="text-[10px] text-muted opacity-70">
          Leave blank for official Anthropic URL, or set a compatible gateway base URL.
        </p>
        <FieldExampleHints
          examples={BASE_URL_EXAMPLES}
          onSelect={onBaseUrlChange}
          disabled={isBusy}
        />
      </div>
    </div>
  )
}
