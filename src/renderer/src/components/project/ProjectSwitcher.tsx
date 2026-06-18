import React, { useRef, useState } from 'react'
import { Dropdown, Label } from '@heroui/react'
import { ChevronDownIcon, EditIcon, PlusIcon, TrashIcon } from '../icons/Icons'
import { useProjectStore } from '../../stores/projectStore'

interface ProjectSwitcherProps {
  onNewProject: () => void
}

type EditingLocation = 'trigger' | 'dropdown'

export default function ProjectSwitcher({ onNewProject }: ProjectSwitcherProps): React.JSX.Element {
  const projects = useProjectStore((s) => s.projects)
  const activeProjectId = useProjectStore((s) => s.activeProjectId)
  const setActiveProjectId = useProjectStore((s) => s.setActiveProjectId)
  const renameProject = useProjectStore((s) => s.renameProject)
  const deleteProject = useProjectStore((s) => s.deleteProject)

  const activeProject = projects.find((p) => p.id === activeProjectId)
  const [menuOpen, setMenuOpen] = useState(false)
  const [triggerHovered, setTriggerHovered] = useState(false)
  const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null)
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [editingLocation, setEditingLocation] = useState<EditingLocation | null>(null)
  const [editingName, setEditingName] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)
  const editingInDropdownRef = useRef(false)

  const clearEditing = (): void => {
    editingInDropdownRef.current = false
    setEditingProjectId(null)
    setEditingLocation(null)
    setEditingName('')
  }

  const submitRename = (projectId: string, currentName: string): void => {
    const nextName = editingName.trim()
    if (nextName && nextName !== currentName) {
      void renameProject(projectId, nextName)
    }
    clearEditing()
  }

  const handleOpenChange = (open: boolean): void => {
    if (!open && editingInDropdownRef.current) return
    setMenuOpen(open)
    if (!open) setHoveredProjectId(null)
  }

  const startRename = (
    project: { id: string; projectName: string },
    location: EditingLocation
  ): void => {
    if (location === 'dropdown') {
      editingInDropdownRef.current = true
      setMenuOpen(true)
    }
    setEditingLocation(location)
    setEditingProjectId(project.id)
    setEditingName(project.projectName)
    requestAnimationFrame(() => {
      renameInputRef.current?.focus()
      renameInputRef.current?.select()
    })
  }

  const handleDelete = (project: { id: string; projectName: string }): void => {
    const message =
      projects.length <= 1
        ? `Delete project "${project.projectName}"? This is your last project.`
        : `Delete project "${project.projectName}"?`
    if (!window.confirm(message)) return
    if (editingProjectId === project.id) clearEditing()
    void deleteProject(project.id)
  }

  const stopItemAction = (event: React.SyntheticEvent): void => {
    event.preventDefault()
    event.stopPropagation()
  }

  const isEditingInTrigger =
    !!activeProject && editingProjectId === activeProject.id && editingLocation === 'trigger'

  const handleActionKeyDown = (event: React.KeyboardEvent, action: () => void): void => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    stopItemAction(event)
    action()
  }

  const renderActionButtons = (
    project: { id: string; projectName: string },
    location: EditingLocation,
    visible: boolean
  ): React.JSX.Element => (
    <div
      className={`flex shrink-0 items-center gap-0.5 transition-opacity ${
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <span
        role="button"
        tabIndex={0}
        className="flex size-6 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-soft hover:text-ink"
        title="Rename"
        aria-label="Rename project"
        onMouseDown={stopItemAction}
        onPointerDown={stopItemAction}
        onClick={(event) => {
          stopItemAction(event)
          startRename(project, location)
        }}
        onKeyDown={(event) => handleActionKeyDown(event, () => startRename(project, location))}
      >
        <EditIcon size={12} />
      </span>
      <span
        role="button"
        tabIndex={0}
        className="flex size-6 cursor-pointer items-center justify-center rounded-full text-[#ff6b6b] transition-colors hover:bg-soft"
        title="Delete"
        aria-label="Delete project"
        onMouseDown={stopItemAction}
        onPointerDown={stopItemAction}
        onClick={(event) => {
          stopItemAction(event)
          handleDelete(project)
        }}
        onKeyDown={(event) => handleActionKeyDown(event, () => handleDelete(project))}
      >
        <TrashIcon size={12} />
      </span>
    </div>
  )

  const renderRenameInput = (project: { id: string; projectName: string }): React.JSX.Element => (
    <input
      ref={renameInputRef}
      value={editingName}
      onChange={(e) => setEditingName(e.target.value)}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Enter') {
          e.preventDefault()
          submitRename(project.id, project.projectName)
        }
        if (e.key === 'Escape') {
          e.preventDefault()
          clearEditing()
        }
      }}
      onBlur={() => submitRename(project.id, project.projectName)}
      onMouseDown={stopItemAction}
      onPointerDown={stopItemAction}
      onClick={stopItemAction}
      className="app-input min-w-0 flex-1"
    />
  )

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onNewProject}
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface-2 text-muted transition-colors hover:text-ink cursor-pointer"
        aria-label="New project"
        title="New project"
      >
        <PlusIcon size={20} />
      </button>

      <div className="text-[16px] mx-2 font-bold text-ink">Project</div>

      <Dropdown isOpen={menuOpen} onOpenChange={handleOpenChange}>
        <Dropdown.Trigger className="w-[320px] min-w-[280px] p-0">
          <div
            className="inline-flex h-10 w-full items-center gap-1 rounded-full border border-line bg-surface-2 px-3 text-[14px] font-medium text-ink"
            onMouseEnter={() => setTriggerHovered(true)}
            onMouseLeave={() => setTriggerHovered(false)}
          >
            {isEditingInTrigger ? (
              renderRenameInput(activeProject)
            ) : (
              <span className="min-w-0 flex-1 truncate text-left">
                {activeProject?.projectName ?? 'No project'}
              </span>
            )}

            {activeProject &&
              !isEditingInTrigger &&
              renderActionButtons(activeProject, 'trigger', triggerHovered)}

            <ChevronDownIcon size={12} className="shrink-0 text-muted" />
          </div>
        </Dropdown.Trigger>
        <Dropdown.Popover placement="bottom" className="min-w-[320px]">
          <Dropdown.Menu
            selectedKeys={activeProjectId ? new Set([activeProjectId]) : new Set()}
            selectionMode="single"
            onAction={(key) => {
              if (editingInDropdownRef.current) return
              if (editingProjectId && editingProjectId !== String(key)) clearEditing()
              setActiveProjectId(String(key))
            }}
          >
            {projects.map((project) => {
              const isEditingItem =
                editingProjectId === project.id && editingLocation === 'dropdown'
              const isHovered = hoveredProjectId === project.id

              return (
                <Dropdown.Item
                  key={project.id}
                  id={project.id}
                  textValue={project.projectName}
                  className="gap-2 py-0 pr-0"
                >
                  <div
                    className="flex w-full items-center gap-2 py-1.5 pr-2"
                    onMouseEnter={() => setHoveredProjectId(project.id)}
                    onMouseLeave={() => setHoveredProjectId(null)}
                  >
                    <Dropdown.ItemIndicator />
                    {isEditingItem ? (
                      renderRenameInput(project)
                    ) : (
                      <Label className="min-w-0 flex-1 truncate">{project.projectName}</Label>
                    )}
                    {!isEditingItem && renderActionButtons(project, 'dropdown', isHovered)}
                  </div>
                </Dropdown.Item>
              )
            })}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </div>
  )
}
