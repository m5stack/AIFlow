import { useCallback, useRef, useState } from 'react'
import type { ChatImageAttachment } from '../types/chat'
import {
  CHAT_IMAGE_MAX_BYTES,
  CHAT_IMAGE_MAX_COUNT,
  isChatImageMediaType
} from '../../../shared/chatImages'

const readImage = (file: File): Promise<ChatImageAttachment> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error(`Could not read ${file.name}.`))
        return
      }
      resolve({
        id: crypto.randomUUID(),
        name: file.name,
        mediaType: file.type as ChatImageAttachment['mediaType'],
        data: result.slice(result.indexOf(',') + 1)
      })
    }
    reader.onerror = () => reject(reader.error ?? new Error(`Could not read ${file.name}.`))
    reader.readAsDataURL(file)
  })

export function useChatImageAttachments(
  disabled: boolean,
  images: ChatImageAttachment[],
  onImagesChange: (images: ChatImageAttachment[]) => void
): {
  imageError: string
  isReadingImages: boolean
  addImageFiles: (files: File[]) => Promise<boolean>
  removeImage: (imageId: string) => void
  clearImages: () => void
} {
  const [imageError, setImageError] = useState('')
  const [isReadingImages, setIsReadingImages] = useState(false)
  const isReadingRef = useRef(false)

  const addImageFiles = useCallback(
    async (files: File[]): Promise<boolean> => {
      if (disabled || isReadingRef.current || files.length === 0) return false

      const remainingSlots = CHAT_IMAGE_MAX_COUNT - images.length
      if (remainingSlots <= 0) {
        setImageError(`You can attach up to ${CHAT_IMAGE_MAX_COUNT} images.`)
        return false
      }

      const supported = files.filter((file) => isChatImageMediaType(file.type))
      setImageError(supported.length === files.length ? '' : 'Use a JPEG, PNG, GIF, or WebP image.')

      const oversized = supported.find((file) => file.size > CHAT_IMAGE_MAX_BYTES)
      if (oversized) {
        setImageError(`${oversized.name} is larger than 5 MB.`)
        return false
      }

      const candidates = supported.slice(0, remainingSlots)
      if (supported.length > remainingSlots) {
        setImageError(`You can attach up to ${CHAT_IMAGE_MAX_COUNT} images.`)
      }
      if (candidates.length === 0) return false

      isReadingRef.current = true
      setIsReadingImages(true)
      try {
        const nextImages = await Promise.all(candidates.map(readImage))
        onImagesChange([...images, ...nextImages].slice(0, CHAT_IMAGE_MAX_COUNT))
        return true
      } catch (error) {
        setImageError(error instanceof Error ? error.message : 'Could not read the image.')
        return false
      } finally {
        isReadingRef.current = false
        setIsReadingImages(false)
      }
    },
    [disabled, images, onImagesChange]
  )

  const removeImage = useCallback(
    (imageId: string): void => {
      onImagesChange(images.filter((image) => image.id !== imageId))
      setImageError('')
    },
    [images, onImagesChange]
  )

  const clearImages = useCallback((): void => {
    onImagesChange([])
    setImageError('')
  }, [onImagesChange])

  return { imageError, isReadingImages, addImageFiles, removeImage, clearImages }
}
