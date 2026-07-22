import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalContainer,
  ModalDialog,
  ModalFooter,
  ModalHeader,
  ModalHeading,
  ProgressBar
} from '@heroui/react'
import type { SkillItem as InstalledSkillItem } from '../../../../shared/types'
import {
  compareVersions,
  isRemoteSkillNewer,
  parseSkillFileName
} from '../../../../shared/skillVersion'
import { formatSkillBaseName, resolveSkillDisplayName } from '../../../../shared/skillDisplay'
import { downloadSkill, getSkillList, type SkillItem as RemoteSkillItem } from '../../api/skill'
import { DownloadIcon, RefreshIcon, TrashIcon } from '../icons/Icons'

type RowStatus = 'download' | 'update' | 'installed' | 'builtin-newer'

type SkillRowState = {
  remote: RemoteSkillItem
  displayName: string
  base: string
  remoteVersion: string
  installedVersion: string
  installed?: InstalledSkillItem
  status: RowStatus
  canDelete: boolean
  isBuiltin: boolean
}

function buildRowState(
  remote: RemoteSkillItem,
  installedSkills: InstalledSkillItem[],
  builtinBases: Set<string>
): SkillRowState {
  const { base, version: remoteVersion } = parseSkillFileName(remote.fileName)
  const installed = installedSkills.find((skill) => parseSkillFileName(skill.slug).base === base)
  const installedVersion = installed?.version ?? parseSkillFileName(installed?.slug ?? '').version
  const displayName = installed
    ? resolveSkillDisplayName(installed.slug, installed.name)
    : formatSkillBaseName(base)

  let status: RowStatus = 'download'
  if (installed) {
    if (
      installed.builtin &&
      installedVersion &&
      remoteVersion &&
      compareVersions(installedVersion, remoteVersion) > 0
    ) {
      status = 'builtin-newer'
    } else {
      status = isRemoteSkillNewer(remoteVersion, installedVersion) ? 'update' : 'installed'
    }
  }

  return {
    remote,
    displayName,
    base,
    remoteVersion,
    installedVersion,
    installed,
    status,
    canDelete: Boolean(installed && !installed.builtin),
    isBuiltin: builtinBases.has(base)
  }
}

interface BrowseSkillDialogProps {
  isOpen: boolean
  onClose: () => void
  installedSkills: InstalledSkillItem[]
  onChanged: (skills: InstalledSkillItem[]) => void
}

type InstallPhase = 'downloading' | 'installing'

type ActiveInstall = {
  fileName: string
  phase: InstallPhase
  progress: number
}

function BuiltinBadge(): React.JSX.Element {
  return (
    <span className="shrink-0 rounded-full bg-accent-bg px-2 py-0.5 text-[10px] font-semibold tracking-wide text-accent">
      Built-in
    </span>
  )
}

function SkillListRow({
  row,
  activeInstall,
  isBusy,
  onDownload,
  onDelete
}: {
  row: SkillRowState
  activeInstall: ActiveInstall | null
  isBusy: boolean
  onDownload: (fileName: string) => void
  onDelete: (slug: string) => void
}): React.JSX.Element {
  const versionLabel =
    row.status === 'builtin-newer'
      ? `Built-in v${row.installedVersion} · SkillHub v${row.remoteVersion}`
      : row.remoteVersion
        ? `v${row.remoteVersion}`
        : null
  const isActive = activeInstall?.fileName === row.remote.fileName

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${
        row.isBuiltin
          ? 'border-[color-mix(in_srgb,var(--accent)_24%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_7%,var(--surface-2))]'
          : 'border-line bg-surface-2'
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[13px] font-semibold text-ink">{row.displayName}</span>
          {row.isBuiltin ? <BuiltinBadge /> : null}
        </div>
        {versionLabel ? (
          <div className="mt-0.5 truncate text-[11px] text-muted" title={versionLabel}>
            {versionLabel}
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {row.status === 'installed' && !isActive ? (
          <span className="rounded-full bg-[color-mix(in_srgb,var(--flow-green)_14%,transparent)] px-2 py-0.5 text-[10px] font-semibold text-[var(--flow-green)]">
            Installed
          </span>
        ) : row.status === 'builtin-newer' && !isActive ? (
          <span
            className="whitespace-nowrap rounded-full bg-accent-bg px-2 py-0.5 text-[10px] font-semibold text-accent"
            title="The built-in version is newer than the SkillHub version"
          >
            Built-in newer
          </span>
        ) : isActive ? (
          <div className="flex w-[132px] flex-col gap-1">
            <span className="text-[10px] text-muted">
              {activeInstall.phase === 'downloading' ? 'Downloading…' : 'Installing…'}
            </span>
            <ProgressBar
              value={activeInstall.progress}
              minValue={0}
              maxValue={100}
              aria-label={`${row.displayName} install progress`}
            >
              <ProgressBar.Track className="h-1.5">
                <ProgressBar.Fill />
              </ProgressBar.Track>
            </ProgressBar>
          </div>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            className="h-7 min-w-[78px] cursor-pointer text-[11px]"
            isDisabled={isBusy}
            onClick={() => onDownload(row.remote.fileName)}
          >
            {row.status === 'update' ? (
              <span className="inline-flex items-center gap-1">
                <RefreshIcon size={10} />
                Update
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <DownloadIcon size={10} />
                Download
              </span>
            )}
          </Button>
        )}

        {row.canDelete && row.installed && !isActive ? (
          <button
            type="button"
            className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md border border-line bg-surface text-[#ff6b6b] transition-colors hover:bg-soft disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={`Delete ${row.displayName}`}
            disabled={isBusy}
            onClick={() => onDelete(row.installed!.slug)}
          >
            <TrashIcon size={12} />
          </button>
        ) : null}
      </div>
    </div>
  )
}

export default function BrowseSkillDialog({
  isOpen,
  onClose,
  installedSkills,
  onChanged
}: BrowseSkillDialogProps): React.JSX.Element {
  const [remoteSkills, setRemoteSkills] = useState<RemoteSkillItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyFileName, setBusyFileName] = useState<string | null>(null)
  const [activeInstall, setActiveInstall] = useState<ActiveInstall | null>(null)

  const loadRemoteSkills = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      const items = await getSkillList()
      setRemoteSkills(items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preset skills')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return
    // Data fetch on dialog open; setState runs inside async callback.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load preset skills when dialog opens
    void loadRemoteSkills()
  }, [isOpen, loadRemoteSkills])

  const builtinBaseOrder = useMemo(
    () =>
      installedSkills
        .filter((skill) => skill.builtin)
        .map((skill) => parseSkillFileName(skill.slug).base),
    [installedSkills]
  )

  const builtinBases = useMemo(() => new Set(builtinBaseOrder), [builtinBaseOrder])

  const rows = useMemo(() => {
    const getBuiltinPinIndex = (base: string): number => {
      const index = builtinBaseOrder.indexOf(base)
      return index === -1 ? Number.MAX_SAFE_INTEGER : index
    }

    const sorted = [...remoteSkills].sort((a, b) => {
      const aBase = parseSkillFileName(a.fileName).base
      const bBase = parseSkillFileName(b.fileName).base
      const pinCompare = getBuiltinPinIndex(aBase) - getBuiltinPinIndex(bBase)
      if (pinCompare !== 0) return pinCompare

      const baseCompare = aBase.localeCompare(bBase, undefined, { sensitivity: 'base' })
      if (baseCompare !== 0) return baseCompare
      return compareVersions(
        parseSkillFileName(a.fileName).version,
        parseSkillFileName(b.fileName).version
      )
    })

    return sorted.map((remote) => buildRowState(remote, installedSkills, builtinBases))
  }, [builtinBaseOrder, builtinBases, installedSkills, remoteSkills])

  const handleClose = (): void => {
    if (busyFileName) return
    setRemoteSkills([])
    setError(null)
    setBusyFileName(null)
    setActiveInstall(null)
    onClose()
  }

  const handleDownload = async (fileName: string): Promise<void> => {
    if (busyFileName) return
    const remote = remoteSkills.find((item) => item.fileName === fileName)
    setBusyFileName(fileName)
    setActiveInstall({ fileName, phase: 'downloading', progress: 0 })
    setError(null)
    try {
      const bytes = await downloadSkill(fileName, {
        expectedSize: remote?.size,
        onProgress: ({ percent }) => {
          setActiveInstall({
            fileName,
            phase: 'downloading',
            progress: Math.min(90, Math.round(percent * 0.9))
          })
        }
      })
      setActiveInstall({ fileName, phase: 'downloading', progress: 90 })
      setActiveInstall({ fileName, phase: 'installing', progress: 95 })
      const nextSkills = await window.ipc.skill.install(fileName, bytes)
      setActiveInstall({ fileName, phase: 'installing', progress: 100 })
      onChanged(nextSkills)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to install skill')
    } finally {
      setBusyFileName(null)
      setActiveInstall(null)
    }
  }

  const handleDelete = async (slug: string): Promise<void> => {
    if (busyFileName) return
    const skill = installedSkills.find((item) => item.slug === slug)
    if (!skill || !window.confirm(`Delete skill "${skill.name}"?`)) return

    setBusyFileName(slug)
    setError(null)
    try {
      const nextSkills = await window.ipc.skill.delete(slug)
      onChanged(nextSkills)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete skill')
    } finally {
      setBusyFileName(null)
    }
  }

  return (
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
        isDismissable={!busyFileName}
      >
        <ModalContainer size="lg">
          <ModalDialog>
            <Modal.CloseTrigger />
            <ModalHeader>
              <ModalHeading className="text-lg">SkillHub</ModalHeading>
            </ModalHeader>

            <ModalBody className="flex max-h-[420px] flex-col gap-2.5 overflow-y-auto p-2">
              {error ? <div className="text-[12px] text-muted">{error}</div> : null}

              {isLoading ? (
                <div className="py-8 text-center text-[12px] text-muted">Loading skills…</div>
              ) : rows.length === 0 ? (
                <div className="rounded-md border border-dashed border-line px-3 py-6 text-center text-[12px] text-muted">
                  No preset skills available.
                </div>
              ) : (
                rows.map((row) => (
                  <SkillListRow
                    key={row.remote.fileName}
                    row={row}
                    activeInstall={activeInstall}
                    isBusy={busyFileName !== null}
                    onDownload={(fileName) => void handleDownload(fileName)}
                    onDelete={(slug) => void handleDelete(slug)}
                  />
                ))
              )}
            </ModalBody>

            <ModalFooter className="flex justify-end gap-2 px-2">
              <Button
                variant="ghost"
                className="text-[13px] cursor-pointer"
                onClick={handleClose}
                isDisabled={Boolean(busyFileName)}
              >
                Close
              </Button>
            </ModalFooter>
          </ModalDialog>
        </ModalContainer>
      </ModalBackdrop>
    </Modal>
  )
}
