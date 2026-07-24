import type { ProjectFileNode } from '../../types/project'
import { deviceRelativePathForProjectFile } from '../../../../shared/devicePaths'
import { extensionFromPath } from '../../../../shared/fileExtensions'
import { collectProjectFileNodes } from './flattenProjectFiles'

export const MAIN_PY_PATH = 'main.py'
export const MAIN_OTA_TEMP_PATH = 'main_ota_temp.py'
const DEVICE_APPS_PATH = 'apps'
const DEFAULT_DEVICE_APP_NAME = 'project'
const MAX_DEVICE_APP_NAME_LENGTH = 64
const AUDIO_EXTENSIONS = new Set(['.aac', '.flac', '.m4a', '.mp3', '.ogg', '.wav'])

const devicePathForProjectFile = (node: ProjectFileNode): string => {
  if (node.language === 'image') return `img/${node.name}`
  if (AUDIO_EXTENSIONS.has(extensionFromPath(node.path))) return `audio/${node.name}`
  return node.path
}

const resolveFileContent = async (
  projectId: string,
  filePath: string,
  selectedPath: string | undefined,
  selectedContent: string
): Promise<string> => {
  if (filePath === selectedPath) return selectedContent
  const file = await window.ipc.project.readFile(projectId, filePath)
  return file.content
}

export const getMainPyContent = async (
  projectId: string,
  selectedPath: string | undefined,
  selectedContent: string
): Promise<string> => resolveFileContent(projectId, MAIN_PY_PATH, selectedPath, selectedContent)

export const isMainPyFile = (node: Pick<ProjectFileNode, 'path' | 'name'>): boolean =>
  node.name === MAIN_PY_PATH || node.path === MAIN_PY_PATH || node.path.endsWith(`/${MAIN_PY_PATH}`)

const dataUrlToBlob = (dataUrl: string): Blob => {
  const commaIndex = dataUrl.indexOf(',')
  if (commaIndex === -1) throw new Error('Invalid data URL.')
  const header = dataUrl.slice(0, commaIndex)
  const base64 = dataUrl.slice(commaIndex + 1)
  const mime = header.match(/:(.*?);/)?.[1] ?? 'application/octet-stream'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

const resolveFileBlob = async (
  projectId: string,
  node: ProjectFileNode,
  selectedPath: string | undefined,
  selectedContent: string
): Promise<Blob> => {
  if (node.language === 'image' || node.language === 'resource') {
    const dataUrl = await window.ipc.project.readFileDataUrl(projectId, node.path)
    return dataUrlToBlob(dataUrl)
  }
  const content =
    node.path === selectedPath
      ? selectedContent
      : (await window.ipc.project.readFile(projectId, node.path)).content
  return new Blob([content], { type: 'text/plain' })
}

export const buildMainPyFile = (content: string): File =>
  new File([content], MAIN_OTA_TEMP_PATH, { type: 'text/plain' })

export const buildDeviceAppFileName = (projectName: string, timestamp = Date.now()): string => {
  const normalizedName = projectName.normalize('NFKC')
  const safeName = normalizedName
    .replace(/[^\p{L}\p{N}_-]+/gu, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
  const truncatedName = [...safeName]
    .slice(0, MAX_DEVICE_APP_NAME_LENGTH)
    .join('')
    .replace(/_+$/g, '')
  return `${truncatedName || DEFAULT_DEVICE_APP_NAME}_${timestamp}.py`
}

export interface DeviceAppFile {
  file: File
  filePath: string
}

export const buildDeviceAppFile = (
  projectName: string,
  content: string,
  timestamp = Date.now()
): DeviceAppFile => {
  const fileName = buildDeviceAppFileName(projectName, timestamp)
  return {
    file: new File([content], fileName, { type: 'text/plain' }),
    filePath: `${DEVICE_APPS_PATH}/${fileName}`
  }
}

export interface DeviceFileBatch {
  files: File[]
  filePaths: string[]
}

export const buildDeviceFiles = async (
  projectId: string,
  fileNodes: ProjectFileNode[],
  selectedPath: string | undefined,
  selectedContent: string
): Promise<DeviceFileBatch> => {
  const nodes = collectProjectFileNodes(fileNodes).filter((node) => !isMainPyFile(node))
  const files: File[] = []
  const filePaths: string[] = []

  for (const node of nodes) {
    const blob = await resolveFileBlob(projectId, node, selectedPath, selectedContent)
    files.push(new File([blob], node.name, { type: blob.type || 'application/octet-stream' }))
    filePaths.push(deviceRelativePathForProjectFile(devicePathForProjectFile(node)))
  }

  return { files, filePaths }
}
