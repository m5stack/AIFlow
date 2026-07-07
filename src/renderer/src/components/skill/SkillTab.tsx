import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Tooltip, toast } from '@heroui/react'
import type { SkillItem } from '../../../../shared/types'
import { getSkillList } from '../../api/skill'
import { findSkillUpdates, type SkillUpdateInfo } from '../../utils/skillUpdates'
import BrowseSkillDialog from './BrowseSkillDialog'
import UpgradeSkillDialog from './UpgradeSkillDialog'
import { DownloadIcon, PlusIcon, RefreshIcon, TrashIcon } from '../icons/Icons'

const CARD_SIZE = 'size-16'

const skillInitial = (name: string): string => {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  const firstChar = [...trimmed][0]
  return firstChar ? firstChar.toUpperCase() : '?'
}

function SkillCard({
  skill,
  hasUpdate,
  onOpen,
  onDelete,
  onUpgrade
}: {
  skill: SkillItem
  hasUpdate: boolean
  onOpen: (slug: string) => void
  onDelete?: (slug: string) => void
  onUpgrade?: (slug: string) => void
}): React.JSX.Element {
  const title = hasUpdate ? `${skill.name} (update available)` : skill.name

  return (
    <div className="group relative">
      <button
        type="button"
        className={`flex ${CARD_SIZE} cursor-pointer items-center justify-center rounded-md border border-line bg-surface-2 text-[30px] font-medium text-ink transition-colors hover:bg-soft`}
        title={title}
        onClick={() => onOpen(skill.slug)}
      >
        {skillInitial(skill.name)}
      </button>

      {hasUpdate && onUpgrade ? (
        <button
          type="button"
          className="absolute -bottom-1 -right-1 z-10 inline-flex size-5 cursor-pointer items-center justify-center rounded-full border border-line bg-[var(--flow-green)] text-white shadow-sm transition-colors hover:opacity-90"
          aria-label={`Upgrade ${skill.name}`}
          title="Update available"
          onClick={(event) => {
            event.stopPropagation()
            onUpgrade(skill.slug)
          }}
        >
          <RefreshIcon size={10} />
        </button>
      ) : null}

      {!skill.builtin && onDelete ? (
        <button
          type="button"
          className="absolute -right-1 -top-1 z-20 inline-flex size-4 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-[#ff6b6b] opacity-0 shadow-sm transition-all hover:bg-soft group-hover:opacity-100"
          aria-label={`Delete ${skill.name}`}
          title={`Delete ${skill.name}`}
          onClick={(event) => {
            event.stopPropagation()
            onDelete(skill.slug)
          }}
        >
          <TrashIcon size={8} />
        </button>
      ) : null}
    </div>
  )
}

function AddSkillCard({
  onAdd,
  disabled
}: {
  onAdd: () => void
  disabled: boolean
}): React.JSX.Element {
  return (
    <Tooltip delay={300}>
      <Tooltip.Trigger className="inline-flex">
        <button
          type="button"
          className={`flex ${CARD_SIZE} cursor-pointer items-center justify-center rounded-md border border-dashed border-line bg-transparent text-muted transition-colors hover:border-accent hover:bg-soft hover:text-ink disabled:cursor-not-allowed disabled:opacity-40`}
          aria-label="Add skill"
          disabled={disabled}
          onClick={onAdd}
        >
          <PlusIcon size={16} />
        </button>
      </Tooltip.Trigger>
      <Tooltip.Content placement="top" showArrow>
        Add skill (folder or zip)
      </Tooltip.Content>
    </Tooltip>
  )
}

function BrowseSkillCard({
  onBrowse,
  disabled
}: {
  onBrowse: () => void
  disabled: boolean
}): React.JSX.Element {
  return (
    <Tooltip delay={300}>
      <Tooltip.Trigger className="inline-flex">
        <button
          type="button"
          className={`flex ${CARD_SIZE} cursor-pointer items-center justify-center rounded-md border border-dashed border-line bg-transparent text-muted transition-colors hover:border-accent hover:bg-soft hover:text-ink disabled:cursor-not-allowed disabled:opacity-40`}
          aria-label="SkillHub"
          disabled={disabled}
          onClick={onBrowse}
        >
          <DownloadIcon size={16} />
        </button>
      </Tooltip.Trigger>
      <Tooltip.Content placement="top" showArrow>
        SkillHub
      </Tooltip.Content>
    </Tooltip>
  )
}

export default function SkillTab(): React.JSX.Element {
  const [skills, setSkills] = useState<SkillItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [isBrowseDialogOpen, setIsBrowseDialogOpen] = useState(false)
  const [upgradeTarget, setUpgradeTarget] = useState<SkillUpdateInfo | null>(null)
  const [remoteSkills, setRemoteSkills] = useState<Awaited<ReturnType<typeof getSkillList>>>([])

  const loadSkills = useCallback(async (): Promise<void> => {
    try {
      const nextSkills = await window.ipc.skill.list()
      setSkills(nextSkills)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      toast.danger(`Load skills failed: ${message}`)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadRemoteSkills = useCallback(async (): Promise<void> => {
    try {
      const items = await getSkillList()
      setRemoteSkills(items)
    } catch {
      // Remote update check is best-effort; ignore network errors.
      setRemoteSkills([])
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load skills and remote update info on mount
    void loadSkills()
    void loadRemoteSkills()
  }, [loadSkills, loadRemoteSkills])

  const skillUpdates = useMemo(() => findSkillUpdates(skills, remoteSkills), [remoteSkills, skills])

  const upgradeSkillName = useMemo(() => {
    if (!upgradeTarget) return ''
    return skills.find((skill) => skill.slug === upgradeTarget.slug)?.name ?? ''
  }, [skills, upgradeTarget])

  const handleSkillsChanged = (nextSkills: SkillItem[]): void => {
    setSkills(nextSkills)
    void loadRemoteSkills()
  }

  const handleAdd = async (): Promise<void> => {
    if (isAdding) return
    setIsAdding(true)
    try {
      const nextSkills = await window.ipc.skill.add()
      handleSkillsChanged(nextSkills)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      toast.danger(`Add skill failed: ${message}`)
    } finally {
      setIsAdding(false)
    }
  }

  const handleDelete = async (slug: string): Promise<void> => {
    const skill = skills.find((item) => item.slug === slug)
    if (!skill || !window.confirm(`Delete skill "${skill.name}"?`)) return

    try {
      const nextSkills = await window.ipc.skill.delete(slug)
      handleSkillsChanged(nextSkills)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      toast.danger(`Delete skill failed: ${message}`)
    }
  }

  const handleOpen = async (slug: string): Promise<void> => {
    try {
      await window.ipc.skill.open(slug)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      toast.danger(`Open skill failed: ${message}`)
    }
  }

  const handleUpgradeClick = (slug: string): void => {
    const update = skillUpdates.get(slug)
    if (!update) return
    setUpgradeTarget(update)
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-[12px] text-muted">
        Loading skills…
      </div>
    )
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        <div className="flex flex-wrap gap-1.5">
          {skills.map((skill) => (
            <SkillCard
              key={skill.slug}
              skill={skill}
              hasUpdate={skillUpdates.has(skill.slug)}
              onOpen={(slug) => void handleOpen(slug)}
              onDelete={skill.builtin ? undefined : handleDelete}
              onUpgrade={handleUpgradeClick}
            />
          ))}
          <BrowseSkillCard onBrowse={() => setIsBrowseDialogOpen(true)} disabled={isAdding} />
          <AddSkillCard onAdd={() => void handleAdd()} disabled={isAdding} />
        </div>
      </div>

      <BrowseSkillDialog
        isOpen={isBrowseDialogOpen}
        onClose={() => setIsBrowseDialogOpen(false)}
        installedSkills={skills}
        onChanged={handleSkillsChanged}
      />

      <UpgradeSkillDialog
        isOpen={upgradeTarget !== null}
        onClose={() => setUpgradeTarget(null)}
        skillName={upgradeSkillName}
        update={upgradeTarget}
        onUpgraded={handleSkillsChanged}
      />
    </>
  )
}
