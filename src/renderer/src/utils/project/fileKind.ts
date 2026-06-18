import type { ProjectFileNode } from '../../types/project'
import { isCodePath, isImagePath } from '../../../../shared/fileExtensions'

export type ProjectFileKind = 'code' | 'image' | 'resource'

export { isImagePath } from '../../../../shared/fileExtensions'

export function fileKindFromLanguage(language?: string): ProjectFileKind {
  if (language === 'image') return 'image'
  if (language === 'resource') return 'resource'
  return 'code'
}

export function fileKindFromPath(path: string, language?: string): ProjectFileKind {
  if (language === 'image' || isImagePath(path)) return 'image'
  if (language === 'resource') return 'resource'
  if (language && language !== 'python') return fileKindFromLanguage(language)
  if (isCodePath(path)) return 'code'
  return 'resource'
}

export function findProjectFileLanguage(
  nodes: ProjectFileNode[],
  path: string
): string | undefined {
  for (const node of nodes) {
    if (node.type === 'file' && node.path === path) return node.language
    if (node.type === 'folder') {
      const found = findProjectFileLanguage(node.children ?? [], path)
      if (found) return found
    }
  }
  return undefined
}

export function resolveFileKind(path: string, files: ProjectFileNode[]): ProjectFileKind {
  return fileKindFromPath(path, findProjectFileLanguage(files, path))
}
