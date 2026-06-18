export type RealtimeMessageType =
  | 'clientConnected'
  | 'deviceConnected'
  | 'deviceLog'
  | 'clientMessage'
  | 'deviceOffline'
  | 'error'

export interface RealtimeMessage {
  type: RealtimeMessageType
  deviceId: string | null
  mac: string | null
  payload: string
  time: number
}
