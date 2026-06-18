import type { ProjectFileNode } from '../../types/project'

export type FlatFileEntry = {
  name: string
  path: string
  language?: string
}

export function collectProjectFileNodes(nodes: ProjectFileNode[]): ProjectFileNode[] {
  const result: ProjectFileNode[] = []
  for (const node of nodes) {
    if (node.type === 'file') result.push(node)
    else if (node.children?.length) result.push(...collectProjectFileNodes(node.children))
  }
  return result
}

export function flattenProjectFiles(
  nodes: ProjectFileNode[],
  prefix = ''
): FlatFileEntry[] {
  const result: FlatFileEntry[] = []
  for (const node of nodes) {
    const displayPath = prefix ? `${prefix}/${node.name}` : node.name
    if (node.type === 'folder') {
      result.push(...flattenProjectFiles(node.children ?? [], displayPath))
    } else {
      result.push({
        name: displayPath,
        path: node.path,
        language: node.language
      })
    }
  }
  return result
}
