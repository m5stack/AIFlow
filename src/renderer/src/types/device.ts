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
  md5: string | null
}

export interface DeviceFileListResponse {
  file_op: number
  fs_path: string
  file_list: DeviceFile[]
}

export interface DeviceFilePreviewResponse {
  pkg_ctx: string
}
