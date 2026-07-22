import type { ProjectFileNode } from '../../types/project'
import { downloadCode, downloadFiles, pushCode } from '../../api/device'
import {
  buildDeviceAppFile,
  buildDeviceFiles,
  buildMainPyFile,
  getMainPyContent
} from '../project/projectRunFiles'

export interface RunProjectOnDeviceArgs {
  projectId: string
  projectName: string
  deviceId: string
  clientId: string
  fileNodes: ProjectFileNode[]
  /** Path of the file currently open in the editor, used to prefer in-memory content. */
  selectedPath?: string
  /** In-memory content for the selected file. */
  selectedContent?: string
  /** When true, saves main.py under apps and runs it via the download-code API. */
  includeMainPyInDownload?: boolean
}

export interface RunProjectOnDeviceResult {
  /** main.py content that was sent; empty string means nothing was sent. */
  mainPyContent: string
  /** Whether code was actually sent to the device. */
  ran: boolean
}

/**
 * Shared "run" logic used by both the manual Run button and chat auto-run.
 * Reads main.py, uploads supporting project files, then runs main.py on the device.
 * Throws on transport failure. Returns an empty/`ran: false` result when there is no code.
 */
export const runProjectOnDevice = async (
  args: RunProjectOnDeviceArgs
): Promise<RunProjectOnDeviceResult> => {
  const {
    projectId,
    projectName,
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

  const { files: nonMainFiles, filePaths: nonMainFilePaths } = await buildDeviceFiles(
    projectId,
    fileNodes,
    selectedPath,
    selectedContent
  )
  const filesToDownload = [...nonMainFiles]
  const filePathsToDownload = [...nonMainFilePaths]

  if (includeMainPyInDownload) {
    const appFile = buildDeviceAppFile(projectName, mainPyContent)
    filesToDownload.push(appFile.file)
    filePathsToDownload.push(appFile.filePath)
  }

  if (filesToDownload.length > 0) {
    await downloadFiles({
      files: filesToDownload,
      filePaths: filePathsToDownload.join(','),
      deviceId,
      clientId
    })
  }

  if (includeMainPyInDownload) {
    await downloadCode([buildMainPyFile(mainPyContent)], deviceId, clientId)
  } else {
    await pushCode(deviceId, mainPyContent)
  }

  return { mainPyContent, ran: true }
}
