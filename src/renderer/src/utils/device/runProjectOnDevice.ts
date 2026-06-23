import type { ProjectFileNode } from '../../types/project'
import { downloadCode, downloadFiles, pushCode } from '../../api/device'
import { buildDeviceFiles, buildMainPyFile, getMainPyContent } from '../project/projectRunFiles'

export interface RunProjectOnDeviceArgs {
  projectId: string
  deviceId: string
  clientId: string
  fileNodes: ProjectFileNode[]
  /** Path of the file currently open in the editor, used to prefer in-memory content. */
  selectedPath?: string
  /** In-memory content for the selected file. */
  selectedContent?: string
  /** When true, uploads project files and main.py via download APIs instead of pushCode. */
  includeMainPyInDownload?: boolean
}

export interface RunProjectOnDeviceResult {
  /** main.py content that was pushed; empty string means nothing was pushed. */
  mainPyContent: string
  /** Whether code was actually sent to the device. */
  ran: boolean
}

/**
 * Shared "run" logic used by both the manual Run button and chat auto-run.
 * Reads main.py, uploads supporting project files, then pushes main.py to the device.
 * Throws on transport failure. Returns an empty/`ran: false` result when there is no code.
 */
export const runProjectOnDevice = async (
  args: RunProjectOnDeviceArgs
): Promise<RunProjectOnDeviceResult> => {
  const {
    projectId,
    deviceId,
    clientId,
    fileNodes,
    selectedPath,
    selectedContent = '',
    includeMainPyInDownload = false
  } = args

  const mainPyContent = (await getMainPyContent(projectId, selectedPath, selectedContent)).trim()

  if (!mainPyContent) {
    return { mainPyContent: '', ran: false }
  }

  const nonMainFiles = await buildDeviceFiles(projectId, fileNodes, selectedPath, selectedContent)

  if (includeMainPyInDownload) {
    if (nonMainFiles.length > 0) {
      await downloadFiles(nonMainFiles, deviceId, clientId)
    }
    await downloadCode([buildMainPyFile(mainPyContent)], deviceId, clientId)
  } else if (nonMainFiles.length > 0) {
    await downloadFiles(nonMainFiles, deviceId, clientId)
    await pushCode(deviceId, mainPyContent)
  } else {
    await pushCode(deviceId, mainPyContent)
  }

  return { mainPyContent, ran: true }
}
