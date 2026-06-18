import { useMemo } from 'react'
import { useDeviceStore } from '../stores/deviceStore'
import { useProjectStore } from '../stores/projectStore'
import type { DeviceItem } from '../types/device'
import type { ProjectItem } from '../types/project'

export type SelectedProjectDevice = DeviceItem & { invalid?: boolean }

export function useActiveProjectDevices(): {
  activeProjectId: string | undefined
  activeProject: ProjectItem | undefined
  activeDeviceId: string
  selectedDevice: SelectedProjectDevice | undefined
} {
  const allDevices = useDeviceStore((s) => s.devices)
  const activeProjectId = useProjectStore((s) => s.activeProjectId)
  const projects = useProjectStore((s) => s.projects)

  const activeProject = projects.find((p) => p.id === activeProjectId)
  const activeDeviceId = activeProject?.activeDeviceId ?? ''
  const selectedDevice = useMemo((): SelectedProjectDevice | undefined => {
    if (!activeDeviceId) return undefined
    const matched = allDevices.find((d) => d.id === activeDeviceId)
    if (matched) return matched
    return { id: activeDeviceId, name: '', type: '', status: 'disconnected', invalid: true }
  }, [activeDeviceId, allDevices])

  return {
    activeProjectId,
    activeProject,
    activeDeviceId,
    selectedDevice
  }
}
