import type { DeviceFileTreeNode } from '../../types/device'

const compareEntries = (
  a: [string, DeviceFileTreeNode | null],
  b: [string, DeviceFileTreeNode | null]
): number => {
  const aIsDir = a[1] !== null
  const bIsDir = b[1] !== null
  if (aIsDir !== bIsDir) return aIsDir ? -1 : 1
  return a[0].localeCompare(b[0], undefined, { sensitivity: 'base' })
}

const appendTreeLines = (node: DeviceFileTreeNode, prefix: string, lines: string[]): void => {
  const entries = Object.entries(node).sort(compareEntries)
  entries.forEach(([name, value], index) => {
    const isLastEntry = index === entries.length - 1
    const connector = isLastEntry ? '└── ' : '├── '
    const isDirectory = value !== null
    const label = isDirectory ? `${name}/` : name
    lines.push(`${prefix}${connector}${label}`)
    if (isDirectory && value) {
      const childPrefix = prefix + (isLastEntry ? '    ' : '│   ')
      appendTreeLines(value, childPrefix, lines)
    }
  })
}

export const formatDeviceFileTree = (tree: DeviceFileTreeNode, rootPath: string): string => {
  const lines = [rootPath || '/']
  appendTreeLines(tree, '', lines)
  return lines.join('\n')
}
