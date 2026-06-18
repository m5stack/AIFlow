import React, { useMemo, useRef } from 'react'
import { FolderIcon, PlusIcon, TrashIcon } from '../icons/Icons'
import PanelShell from '../layout/PanelShell'
import { useProjectStore } from '../../stores/projectStore'
import { flattenProjectFiles } from '../../utils/project/flattenProjectFiles'
import { fileKindFromPath } from '../../utils/project/fileKind'

export default function FilePanel(): React.JSX.Element {
  const activeProjectId = useProjectStore((s) => s.activeProjectId)
  const projects = useProjectStore((s) => s.projects)
  const selectedFile = useProjectStore((s) => s.selectedFile)
  const selectProjectFile = useProjectStore((s) => s.selectProjectFile)
  const importProjectResource = useProjectStore((s) => s.importProjectResource)
  const deleteProjectFile = useProjectStore((s) => s.deleteProjectFile)

  const activeProject = projects.find((p) => p.id === activeProjectId)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const files = useMemo(
    () => flattenProjectFiles(activeProject?.files ?? []),
    [activeProject?.files]
  )

  const handleImportClick = (): void => {
    fileInputRef.current?.click()
  }

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !activeProjectId) return
    void importProjectResource(activeProjectId, file)
  }

  return (
    <PanelShell
      title="File"
      icon={<FolderIcon size={16} />}
      actions={
        <button
          type="button"
          onClick={handleImportClick}
          disabled={!activeProjectId}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md border border-line bg-surface-2 px-2 py-1 text-[12px] text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          <PlusIcon size={12} />
          Add Resource
        </button>
      }
      bodyClassName="overflow-y-auto p-3.5"
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileInputChange}
      />

      <div className="grid gap-2">
        {!activeProject ? (
          <div className="py-6 text-center text-[13px] text-muted">Select a project</div>
        ) : files.length === 0 ? (
          <div className="py-6 text-center text-[13px] text-muted">No files yet</div>
        ) : (
          files.map((file) => {
            const isActive = selectedFile?.path === file.path
            return (
              <div
                key={file.path}
                className={`group flex h-9 items-center justify-between gap-3 rounded-lg border px-3 text-[14px] transition-colors ${
                  isActive
                    ? 'border-accent bg-accent-bg text-ink'
                    : 'border-line bg-surface-2 text-ink hover:bg-soft'
                }`}
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left"
                  onClick={() => {
                    if (!activeProjectId) return
                    void selectProjectFile(activeProjectId, {
                      kind: fileKindFromPath(file.path, file.language),
                      name: file.name.split('/').pop() ?? file.name,
                      path: file.path
                    })
                  }}
                >
                  {file.name}
                </button>
                {file.path !== 'main.py' && (
                  <button
                    type="button"
                    className="inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded text-[#ff6b6b] opacity-0 transition-all hover:bg-soft group-hover:opacity-100"
                    aria-label={`Delete ${file.name}`}
                    onClick={() => {
                      if (!activeProjectId) return
                      if (!window.confirm(`Delete ${file.name}?`)) return
                      void deleteProjectFile(activeProjectId, file.path)
                    }}
                  >
                    <TrashIcon size={12} />
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>
    </PanelShell>
  )
}
