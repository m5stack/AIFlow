import type { ChatImageMediaType } from './types'

export const CHAT_IMAGE_MAX_COUNT = 4
export const CHAT_IMAGE_MAX_BYTES = 5 * 1024 * 1024

const CHAT_IMAGE_MEDIA_TYPES = new Set<ChatImageMediaType>([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
])

export const isChatImageMediaType = (value: string): value is ChatImageMediaType =>
  CHAT_IMAGE_MEDIA_TYPES.has(value as ChatImageMediaType)

export const estimateBase64Bytes = (data: string): number => {
  const padding = data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0
  return Math.max(0, Math.floor((data.length * 3) / 4) - padding)
}
