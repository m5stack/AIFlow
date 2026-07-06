import React, { useCallback, useEffect, useState } from 'react'
import { Tooltip } from '@heroui/react'
import type { SkillItem } from '../../../../shared/types'
import { PlusIcon, TrashIcon } from '../icons/Icons'

const CARD_SIZE = 'size-14'

const skillInitial = (name: string): string => {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  const firstChar = [...trimmed][0]
  return firstChar ? firstChar.toUpperCase() : '?'
}

function SkillCard({
  skill,
  onOpen,
  onDelete
}: {
  skill: SkillItem
  onOpen: (slug: string) => void
  onDelete?: (slug: string) => void
}): React.JSX.Element {
  return (
    <div className="group relative">
      <Tooltip delay={300}>
        <Tooltip.Trigger className="inline-flex">
          <button
            type="button"
            className={`flex ${CARD_SIZE} cursor-pointer items-center justify-center rounded-md border border-line bg-surface-2 text-[16px] font-medium text-ink transition-colors hover:bg-soft`}
            onClick={() => onOpen(skill.slug)}
          >
            {skillInitial(skill.name)}
          </button>
        </Tooltip.Trigger>
        <Tooltip.Content placement="top" showArrow>
          {skill.name}
        </Tooltip.Content>
      </Tooltip>
      {!skill.builtin && onDelete ? (
        <button
          type="button"
          className="absolute -right-1 -top-1 inline-flex size-4 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-[#ff6b6b] opacity-0 shadow-sm transition-all hover:bg-soft group-hover:opacity-100"
          aria-label={`Delete ${skill.name}`}
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
        Add skill
      </Tooltip.Content>
    </Tooltip>
  )
}

export default function SkillTab(): React.JSX.Element {
  const [skills, setSkills] = useState<SkillItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadSkills = useCallback(async (): Promise<void> => {
    setError(null)
    try {
      const nextSkills = await window.ipc.skill.list()
      setSkills(nextSkills)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load skills')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSkills()
  }, [loadSkills])

  const handleAdd = async (): Promise<void> => {
    if (isAdding) return
    setIsAdding(true)
    setError(null)
    try {
      const nextSkills = await window.ipc.skill.add()
      setSkills(nextSkills)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add skill')
    } finally {
      setIsAdding(false)
    }
  }

  const handleDelete = async (slug: string): Promise<void> => {
    const skill = skills.find((item) => item.slug === slug)
    if (!skill || !window.confirm(`Delete skill "${skill.name}"?`)) return

    setError(null)
    try {
      const nextSkills = await window.ipc.skill.delete(slug)
      setSkills(nextSkills)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete skill')
    }
  }

  const handleOpen = async (slug: string): Promise<void> => {
    setError(null)
    try {
      await window.ipc.skill.open(slug)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open skill folder')
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-[12px] text-muted">
        Loading skills…
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
      {error ? <div className="text-[12px] text-muted">{error}</div> : null}
      <div className="flex flex-wrap gap-1.5">
        {skills.map((skill) => (
          <SkillCard
            key={skill.slug}
            skill={skill}
            onOpen={(slug) => void handleOpen(slug)}
            onDelete={skill.builtin ? undefined : handleDelete}
          />
        ))}
        <AddSkillCard onAdd={() => void handleAdd()} disabled={isAdding} />
      </div>
    </div>
  )
}
