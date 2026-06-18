export interface DeviceItem {
  id: string
  name: string
  type: string
  status: 'connected' | 'disconnected'
  pairCode?: string
  tempId?: string
  invalid?: boolean
}
