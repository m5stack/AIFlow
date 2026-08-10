import type { ChatImageAttachment, ChatImageMediaType } from './types'

export const CHAT_IMAGE_MAX_COUNT = 4
export const CHAT_IMAGE_MAX_BYTES = 5 * 1024 * 1024
export const CHAT_IMAGE_MCP_SERVER_NAME = 'aiflow_internal_chat_images'

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

export const validateChatImages = (images: ChatImageAttachment[]): void => {
  if (images.length > CHAT_IMAGE_MAX_COUNT) {
    throw new Error(`A message can contain up to ${CHAT_IMAGE_MAX_COUNT} images.`)
  }

  for (const image of images) {
    if (!image || !isChatImageMediaType(image.mediaType)) {
      throw new Error('Unsupported image type. Use JPEG, PNG, GIF, or WebP.')
    }
    if (!image.data) {
      throw new Error(`Image "${image.name || 'attachment'}" contains invalid data.`)
    }
    if (estimateBase64Bytes(image.data) > CHAT_IMAGE_MAX_BYTES) {
      throw new Error(`Image "${image.name || 'attachment'}" is larger than 5 MB.`)
    }
    if (image.data.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(image.data)) {
      throw new Error(`Image "${image.name || 'attachment'}" contains invalid data.`)
    }
  }
}
