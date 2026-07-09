export interface DeviceItem {
  id: string
  name: string
  type: string
  status: 'connected' | 'disconnected'
  pairCode?: string
  tempId?: string
  invalid?: boolean
}

export interface DeviceFile {
  name: string
  isDirectory: boolean
}

export type DeviceFileTreeNode = {
  [name: string]: DeviceFileTreeNode | null
}

export interface DeviceFileTreeResponse {
  file_op: number
  fs_path: string
  tree: DeviceFileTreeNode
}

export interface DeviceFilePreviewResponse {
  pkg_ctx: string
}
