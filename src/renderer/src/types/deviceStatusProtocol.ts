export interface DeviceStatusSnapshotItem {
  deviceId: string
  name: string | null
  type: string
  status: 0 | 1
}

export interface DeviceStatusListMessage {
  type: 'deviceStatusList'
  clientId: string
  devices: DeviceStatusSnapshotItem[]
  time: number
}

export interface DeviceStatusChangedMessage {
  type: 'deviceStatusChanged'
  clientId: string
  deviceId: string
  status: 0 | 1
  time: number
}

export interface DeviceStatusErrorMessage {
  type: 'error'
  clientId: string
  payload: string
  time: number
}

export type DeviceStatusMessage =
  | DeviceStatusListMessage
  | DeviceStatusChangedMessage
  | DeviceStatusErrorMessage
