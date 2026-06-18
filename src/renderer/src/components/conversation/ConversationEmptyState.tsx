import React from 'react'
import { CodeIcon, PlusIcon } from '../icons/Icons'

interface ConversationEmptyStateProps {
  onCreateProject?: () => void
}

export default function ConversationEmptyState({ onCreateProject }: ConversationEmptyStateProps): React.JSX.Element {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-4 py-6 text-center">
      <div className="max-w-[420px]">
        <div className="mb-3 flex justify-center">
          <CodeIcon size={40} className="text-muted opacity-30" />
        </div>
        <h2 className="text-[18px] font-semibold text-ink">No project yet</h2>
        <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
          Create a project to start editing code and chatting with the assistant.
        </p>
        {onCreateProject && (
          <button
            type="button"
            onClick={onCreateProject}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-accent bg-accent-bg px-4 py-2 text-[13px] font-medium text-ink transition-opacity hover:opacity-80 active:opacity-60"
          >
            <PlusIcon size={13} />
            New Project
          </button>
        )}
      </div>
    </div>
  )
}
