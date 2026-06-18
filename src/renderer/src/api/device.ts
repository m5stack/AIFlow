import type { DeviceItem } from '../types/device'
import { http } from './client'
import { normalizeDeviceItem, normalizeDeviceList } from './deviceNormalize'

const API_PATH = {
  bind: '/pair-code/bind',
  unbind: '/device/unbind',
  rename: '/device/name',
  listByTempId: '/pair-code/by-temp-id',
  pushCode: (deviceId: string) => `/device/push-code/${encodeURIComponent(deviceId)}`,
  downloadFiles: '/localFiles/upload-resource-batch-and-push',
  downloadCode: '/localFiles/upload-python-batch-and-push'
} as const

export interface BindDevicePayload {
  pairCode: string
  tempId: string
  name: string
}

export interface UnbindDevicePayload {
  tempId: string
  deviceId: string
}

export interface RenameDevicePayload {
  deviceId: string
  name: string
}

export { normalizeDeviceItem, normalizeDeviceList }

async function uploadBatchAndPush(
  path: string,
  files: File[],
  deviceId: string,
  clientId?: string
): Promise<void> {
  const formData = new FormData()
  for (const file of files) {
    formData.append('files', file, file.name)
  }
  formData.append('deviceId', deviceId)
  if (clientId) formData.append('clientId', clientId)
  await http.post(path, formData)
}

export const bindDevice = async (payload: BindDevicePayload): Promise<DeviceItem> => {
  const { data } = await http.postForm(API_PATH.bind, payload)
  return normalizeDeviceItem(data, { pairCode: payload.pairCode, tempId: payload.tempId })
}

export const unbindDevice = async (payload: UnbindDevicePayload): Promise<void> => {
  await http.post(API_PATH.unbind, payload)
}

export const renameDevice = async (payload: RenameDevicePayload): Promise<void> => {
  await http.post(API_PATH.rename, payload)
}

export const getDevicesByTempId = async (tempId: string): Promise<DeviceItem[]> => {
  const { data } = await http.get(API_PATH.listByTempId, { params: { tempId } })
  return normalizeDeviceList(data, tempId)
}

/** Push project code to device (body: message, Content-Type: text/plain). */
export const pushCode = async (deviceId: string, message: string): Promise<void> => {
  await http.post(API_PATH.pushCode(deviceId), message, {
    headers: { 'Content-Type': 'text/plain' }
  })
}

export const downloadFiles = async (
  files: File[],
  deviceId: string,
  clientId?: string
): Promise<void> => uploadBatchAndPush(API_PATH.downloadFiles, files, deviceId, clientId)

export const downloadCode = async (
  files: File[],
  deviceId: string,
  clientId?: string
): Promise<void> => uploadBatchAndPush(API_PATH.downloadCode, files, deviceId, clientId)
