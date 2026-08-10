import { createHash } from 'crypto'
import type { McpSdkServerConfigWithInstance } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'
import {
  DEVICE_TYPE,
  getScreenSize,
  normalizeDeviceTypeForPinMap,
  type DeviceScreenSize
} from '../../shared/deviceInfo'
import { deviceAbsolutePathForProjectFile } from '../../shared/devicePaths'
import {
  CHAT_IMAGE_MCP_SERVER_NAME,
  isChatImageMediaType,
  validateChatImages
} from '../../shared/chatImages'
import type {
  AgentActiveDevice,
  ChatImageAttachment,
  ProjectConversation
} from '../../shared/types'
import type { ProjectService } from './projectService'

export const LIST_CHAT_IMAGES_TOOL_NAME = `mcp__${CHAT_IMAGE_MCP_SERVER_NAME}__list_chat_images`
export const SAVE_CHAT_IMAGE_TOOL_NAME = `mcp__${CHAT_IMAGE_MCP_SERVER_NAME}__save_chat_image`

const MAX_INPUT_PIXELS = 64_000_000
const JPEG_QUALITY = 85
const HASH_LENGTHS = [12, 16, 24, 32, 64] as const
const KNOWN_DEVICE_TYPES = new Set<string>(Object.values(DEVICE_TYPE))

let saveQueue: Promise<void> = Promise.resolve()

const enqueueImageSave = <T>(task: () => Promise<T>): Promise<T> => {
  const result = saveQueue.then(task, task)
  saveQueue = result.then(
    () => undefined,
    () => undefined
  )
  return result
}

const MEDIA_TYPE_FORMATS = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp'
} as const

type ChatImageCatalogEntry = {
  image: ChatImageAttachment
  messageId: string
  messageTimestamp: string
  currentTurn: boolean
}

export type OptimizedChatImage = {
  data: Buffer
  extension: 'jpg' | 'png'
  format: 'jpeg' | 'png'
  width: number
  height: number
  animationFrameOnly: boolean
}

export type SavedChatImageResource = Omit<OptimizedChatImage, 'data' | 'extension'> & {
  attachmentId: string
  originalName: string
  projectPath: string
  devicePath: string
  reused: boolean
}

export type ChatImageMcpContext = {
  server: McpSdkServerConfigWithInstance
  autoAllowedToolNames: ReadonlySet<string>
  systemPrompt: string
}

type CreateChatImageMcpContextParams = {
  projectId: string
  conversation: ProjectConversation
  currentImages: ChatImageAttachment[]
  activeDevice?: AgentActiveDevice
  projectService: ProjectService
  onResourceSaved: (resource: SavedChatImageResource) => void
}

export type ChatImageToolOperations = {
  list: () => ReturnType<typeof toolTextResult>
  save: (
    attachmentId: string
  ) => Promise<ReturnType<typeof toolTextResult> | ReturnType<typeof toolErrorResult>>
}

const isChatImageAttachment = (value: unknown): value is ChatImageAttachment => {
  if (!value || typeof value !== 'object') return false
  const image = value as Partial<ChatImageAttachment>
  return (
    typeof image.id === 'string' &&
    image.id.length > 0 &&
    typeof image.name === 'string' &&
    typeof image.mediaType === 'string' &&
    isChatImageMediaType(image.mediaType) &&
    typeof image.data === 'string'
  )
}

const collectChatImageCatalog = (
  conversation: ProjectConversation,
  currentImages: ChatImageAttachment[]
): ChatImageCatalogEntry[] => {
  const entriesById = new Map<string, ChatImageCatalogEntry>()

  for (const message of conversation.messages) {
    for (const image of message.images ?? []) {
      if (!isChatImageAttachment(image) || entriesById.has(image.id)) continue
      entriesById.set(image.id, {
        image,
        messageId: message.id,
        messageTimestamp: message.timestamp,
        currentTurn: false
      })
    }
  }

  const currentEntries: ChatImageCatalogEntry[] = []
  const currentIds = new Set<string>()
  for (const image of currentImages) {
    if (!isChatImageAttachment(image) || currentIds.has(image.id)) continue
    currentIds.add(image.id)
    const persisted = entriesById.get(image.id)
    currentEntries.push({
      image,
      messageId: persisted?.messageId ?? '',
      messageTimestamp: persisted?.messageTimestamp ?? '',
      currentTurn: true
    })
  }

  const historicalEntries = Array.from(entriesById.values())
    .filter((entry) => !currentIds.has(entry.image.id))
    .reverse()

  return [...currentEntries, ...historicalEntries]
}

const resolveDeviceScreen = (activeDevice?: AgentActiveDevice): DeviceScreenSize => {
  if (!activeDevice?.type) {
    throw new Error('Select a device with a built-in display before saving a chat image.')
  }

  const normalizedType = normalizeDeviceTypeForPinMap(activeDevice.type)
  if (!KNOWN_DEVICE_TYPES.has(normalizedType)) {
    throw new Error(`The selected device type "${activeDevice.type}" is not recognized.`)
  }

  const screen = getScreenSize(normalizedType)
  if (screen.width <= 0 || screen.height <= 0) {
    throw new Error(`The selected device "${activeDevice.name}" has no built-in display.`)
  }
  return screen
}

const optimizeChatImage = async (
  image: ChatImageAttachment,
  screen: DeviceScreenSize
): Promise<OptimizedChatImage> => {
  validateChatImages([image])
  if (screen.width <= 0 || screen.height <= 0) {
    throw new Error('A positive device screen size is required to optimize an image.')
  }

  const input = Buffer.from(image.data, 'base64')
  const { default: sharp } = await import('sharp')
  const pipeline = sharp(input, {
    animated: false,
    page: 0,
    pages: 1,
    failOn: 'error',
    limitInputPixels: MAX_INPUT_PIXELS
  })
  const metadata = await pipeline.metadata()
  const expectedFormat = MEDIA_TYPE_FORMATS[image.mediaType]
  if (metadata.format !== expectedFormat) {
    throw new Error(`Image "${image.name}" content does not match ${image.mediaType}.`)
  }

  const resized = pipeline.rotate().resize({
    width: screen.width,
    height: screen.height,
    fit: 'inside',
    withoutEnlargement: true
  })
  const animationFrameOnly = (metadata.pages ?? 1) > 1
  const output =
    image.mediaType === 'image/jpeg'
      ? await resized.jpeg({ quality: JPEG_QUALITY }).toBuffer({ resolveWithObject: true })
      : await resized.png({ compressionLevel: 9 }).toBuffer({ resolveWithObject: true })

  return {
    data: output.data,
    extension: image.mediaType === 'image/jpeg' ? 'jpg' : 'png',
    format: image.mediaType === 'image/jpeg' ? 'jpeg' : 'png',
    width: output.info.width,
    height: output.info.height,
    animationFrameOnly
  }
}

const saveOptimizedChatImage = async (params: {
  projectId: string
  image: ChatImageAttachment
  activeDevice?: AgentActiveDevice
  projectService: ProjectService
}): Promise<SavedChatImageResource> => {
  const screen = resolveDeviceScreen(params.activeDevice)
  const optimized = await optimizeChatImage(params.image, screen)
  const hash = createHash('sha256').update(optimized.data).digest('hex')

  for (const hashLength of HASH_LENGTHS) {
    const projectPath = `img/chat-image-${hash.slice(0, hashLength)}.${optimized.extension}`
    const writeResult = await params.projectService.writeGeneratedResource(
      params.projectId,
      projectPath,
      optimized.data
    )
    if (writeResult === 'conflict') continue

    return {
      attachmentId: params.image.id,
      originalName: params.image.name,
      projectPath,
      devicePath: deviceAbsolutePathForProjectFile(projectPath),
      width: optimized.width,
      height: optimized.height,
      format: optimized.format,
      animationFrameOnly: optimized.animationFrameOnly,
      reused: writeResult === 'reused'
    }
  }

  throw new Error('Could not create a unique project path for the optimized image.')
}

const toolTextResult = (
  value: unknown
): {
  content: Array<{ type: 'text'; text: string }>
  structuredContent: Record<string, unknown>
} => ({
  content: [{ type: 'text' as const, text: JSON.stringify(value) }],
  structuredContent: value as Record<string, unknown>
})

const toolErrorResult = (
  error: unknown
): { content: Array<{ type: 'text'; text: string }>; isError: true } => ({
  content: [
    {
      type: 'text' as const,
      text: error instanceof Error ? error.message : 'Could not save the chat image.'
    }
  ],
  isError: true
})

const createChatImageToolOperations = (
  params: CreateChatImageMcpContextParams
): ChatImageToolOperations | undefined => {
  const catalog = collectChatImageCatalog(params.conversation, params.currentImages)
  if (catalog.length === 0) return undefined

  const catalogById = new Map(catalog.map((entry) => [entry.image.id, entry]))
  const inFlightSaves = new Map<string, Promise<SavedChatImageResource>>()

  return {
    list: () =>
      toolTextResult({
        images: catalog.map((entry) => ({
          attachmentId: entry.image.id,
          name: entry.image.name,
          mediaType: entry.image.mediaType,
          messageId: entry.messageId,
          messageTimestamp: entry.messageTimestamp,
          currentTurn: entry.currentTurn
        }))
      }),
    save: async (attachmentId) => {
      const entry = catalogById.get(attachmentId)
      if (!entry) return toolErrorResult(new Error('Chat image attachment was not found.'))

      try {
        let savePromise = inFlightSaves.get(attachmentId)
        if (!savePromise) {
          savePromise = enqueueImageSave(async () => {
            const resource = await saveOptimizedChatImage({
              projectId: params.projectId,
              image: entry.image,
              activeDevice: params.activeDevice,
              projectService: params.projectService
            })
            params.onResourceSaved(resource)
            return resource
          })
          inFlightSaves.set(attachmentId, savePromise)
          const clearInFlight = (): void => {
            if (inFlightSaves.get(attachmentId) === savePromise) {
              inFlightSaves.delete(attachmentId)
            }
          }
          void savePromise.then(clearInFlight, clearInFlight)
        }
        const resource = await savePromise
        return toolTextResult(
          resource.animationFrameOnly
            ? {
                ...resource,
                note: 'The source was animated; the saved device resource contains its first frame.'
              }
            : resource
        )
      } catch (error) {
        return toolErrorResult(error)
      }
    }
  }
}

export const createChatImageMcpContext = async (
  params: CreateChatImageMcpContextParams
): Promise<ChatImageMcpContext | undefined> => {
  const operations = createChatImageToolOperations(params)
  if (!operations) return undefined

  const { createSdkMcpServer, tool } = await import('@anthropic-ai/claude-agent-sdk')
  const server = createSdkMcpServer({
    name: CHAT_IMAGE_MCP_SERVER_NAME,
    version: '1.0.0',
    alwaysLoad: true,
    instructions: [
      'Chat image attachments are not project or device files until save_chat_image succeeds.',
      'Use save_chat_image only when the user needs an exact chat image as a project or device resource.',
      'For visual analysis alone, do not save the image.',
      'A projectPath and devicePath returned by save_chat_image are authoritative for the current turn.'
    ].join(' '),
    tools: [
      tool(
        'list_chat_images',
        'List image attachments available in the current AIFlow conversation without saving them.',
        {},
        async () => operations.list(),
        { alwaysLoad: true }
      ),
      tool(
        'save_chat_image',
        'Create a screen-sized, device-compatible project resource from one AIFlow chat image. Use the returned devicePath exactly in device code.',
        {
          attachment_id: z.string().min(1).describe('Attachment ID returned by list_chat_images')
        },
        async ({ attachment_id }) => operations.save(attachment_id),
        { alwaysLoad: true }
      )
    ]
  })

  const systemPrompt = [
    'AIFlow chat image rules:',
    'Image attachments are visual context only until the internal save_chat_image tool succeeds.',
    'When the user asks to display or otherwise use an exact chat image on the device, call save_chat_image before writing code and use its returned devicePath exactly.',
    'Use list_chat_images to locate an attachment from an earlier turn.',
    'Do not call save_chat_image for visual analysis that does not require a project or device file.',
    ...(params.currentImages.length > 0
      ? ['Current-turn attachment metadata is labeled directly before each image block.']
      : [
          'This turn has no new images, but earlier conversation images are available through list_chat_images.'
        ])
  ].join('\n')

  return {
    server,
    autoAllowedToolNames: new Set([LIST_CHAT_IMAGES_TOOL_NAME, SAVE_CHAT_IMAGE_TOOL_NAME]),
    systemPrompt
  }
}
