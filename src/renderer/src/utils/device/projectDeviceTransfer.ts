import type { ProjectFileNode } from '../../types/project'
import { downloadFiles } from '../../api/device'
import { requestDeviceFileTreeRefresh } from '../../stores/deviceFileTreeStore'
import { buildDeviceAppFile, buildDeviceFiles, getMainPyContent } from '../project/projectRunFiles'

export interface ProjectDeviceTransferArgs {
  projectId: string
  projectName: string
  deviceId: string
  clientId: string
  fileNodes: ProjectFileNode[]
  selectedPath?: string
  selectedContent?: string
}

export interface ProjectDeviceTransferResult {
  mainPyContent: string
  transferred: boolean
}

interface ProjectDeviceTransferOptions {
  includeAppFile: boolean
}

export const transferProjectFilesToDevice = async (
  args: ProjectDeviceTransferArgs,
  options: ProjectDeviceTransferOptions
): Promise<ProjectDeviceTransferResult> => {
  const {
    projectId,
    projectName,
    deviceId,
    clientId,
    fileNodes,
    selectedPath,
    selectedContent = ''
  } = args
  const { includeAppFile } = options

  const mainPyContent = (await getMainPyContent(projectId, selectedPath, selectedContent)).trim()
  if (!mainPyContent) return { mainPyContent: '', transferred: false }

  const { files, filePaths } = await buildDeviceFiles(
    projectId,
    fileNodes,
    selectedPath,
    selectedContent
  )

  if (includeAppFile) {
    const appFile = buildDeviceAppFile(projectName, mainPyContent)
    files.push(appFile.file)
    filePaths.push(appFile.filePath)
  }

  if (files.length === 0) return { mainPyContent, transferred: false }

  await downloadFiles({
    files,
    filePaths: filePaths.join(','),
    deviceId,
    clientId
  })
  return { mainPyContent, transferred: true }
}

export interface SendProjectToDeviceResult {
  mainPyContent: string
  sent: boolean
}

export const sendProjectToDevice = async (
  args: ProjectDeviceTransferArgs
): Promise<SendProjectToDeviceResult> => {
  const result = await transferProjectFilesToDevice(args, { includeAppFile: true })
  if (result.transferred) requestDeviceFileTreeRefresh(args.deviceId)
  return { mainPyContent: result.mainPyContent, sent: result.transferred }
}
