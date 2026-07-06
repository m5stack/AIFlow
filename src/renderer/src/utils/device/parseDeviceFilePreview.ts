import {
  extensionFromPath,
  isImagePath,
  languageForFilePath,
  mimeByExtension
} from '../../../../shared/fileExtensions'

export type DeviceFilePreviewData =
  | { kind: 'image'; url: string; bytes: Uint8Array; mime: string }
  | { kind: 'text'; content: string; language: string }
  | { kind: 'unsupported' }

export const coercePkgCtx = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (value == null) return ''
  return String(value)
}

export const normalizeBase64Input = (raw: string): string => {
  let value = raw.trim()
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim()
  }
  const dataUrlMatch = /^data:[^;,]+(?:;[^;,]+)*;base64,(.+)$/is.exec(value)
  if (dataUrlMatch) {
    value = dataUrlMatch[1]
  }
  // Literal escape sequences from API/JSON strings, e.g. "\\n" -> two chars \ and n
  value = value.replace(/\\[nrt]/g, '')
  // Actual whitespace and line breaks inside base64 payloads
  value = value.replace(/[\r\n\t\f\v]/g, '')
  value = value.replace(/ /g, '+')
  if (!value.includes('+') && (value.includes('-') || value.includes('_'))) {
    value = value.replace(/-/g, '+').replace(/_/g, '/')
  }
  const padding = value.length % 4
  if (padding) {
    value += '='.repeat(4 - padding)
  }
  return value
}

const isLikelyBase64 = (value: string): boolean =>
  value.length > 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(value)

const decodeBase64ToBytes = (base64: string): Uint8Array | null => {
  try {
    if (!isLikelyBase64(base64)) return null
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  } catch {
    return null
  }
}

const decodeBase64Text = (raw: string): string | null => {
  const bytes = decodeBase64ToBytes(normalizeBase64Input(raw))
  if (!bytes) return null
  try {
    return new TextDecoder().decode(bytes)
  } catch {
    return null
  }
}

const isSvgMarkup = (text: string): boolean => {
  const trimmed = text.trimStart()
  return trimmed.startsWith('<svg') || trimmed.startsWith('<?xml') || trimmed.includes('<svg')
}

const mimeFromImageBytes = (bytes: Uint8Array): string | null => {
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    return 'image/jpeg'
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'image/png'
  }
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return 'image/gif'
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp'
  }
  if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) {
    return 'image/bmp'
  }
  return null
}

const buildImageDataUrl = (base64: string, mime: string): string =>
  `data:${mime};base64,${base64}`

const buildSvgDataUrl = (markup: string): string =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup.trim())}`

const decodeImagePayload = (raw: string): { base64: string; bytes: Uint8Array } | null => {
  const normalized = normalizeBase64Input(raw)
  if (!isLikelyBase64(normalized)) return null

  const bytes = decodeBase64ToBytes(normalized)
  if (!bytes?.length) return null

  return { base64: normalized, bytes }
}

const parseImagePreview = (pkgCtx: string, fileName: string): DeviceFilePreviewData => {
  const ext = extensionFromPath(fileName)
  const extMime = mimeByExtension[ext] ?? 'image/jpeg'

  if (ext === '.svg' && isSvgMarkup(pkgCtx)) {
    const markup = pkgCtx.trim()
    const bytes = new TextEncoder().encode(markup)
    return {
      kind: 'image',
      url: buildSvgDataUrl(markup),
      bytes,
      mime: 'image/svg+xml'
    }
  }

  const payload = decodeImagePayload(pkgCtx)
  if (!payload) {
    return { kind: 'unsupported' }
  }

  if (ext === '.svg') {
    const markup = new TextDecoder().decode(payload.bytes)
    if (isSvgMarkup(markup)) {
      return {
        kind: 'image',
        url: buildSvgDataUrl(markup),
        bytes: payload.bytes,
        mime: 'image/svg+xml'
      }
    }
    return { kind: 'unsupported' }
  }

  const mime = mimeFromImageBytes(payload.bytes) ?? extMime
  return {
    kind: 'image',
    url: buildImageDataUrl(payload.base64, mime),
    bytes: payload.bytes,
    mime
  }
}

export const parseDeviceFilePreview = (
  pkgCtx: unknown,
  fileName: string
): DeviceFilePreviewData => {
  const content = extractPreviewPkgCtx(pkgCtx)

  if (!content) {
    return { kind: 'unsupported' }
  }

  if (isImagePath(fileName)) {
    return parseImagePreview(content, fileName)
  }

  const language = languageForFilePath(fileName)
  if (language && language !== 'image') {
    const text = decodeBase64Text(content)
    if (text === null) {
      return { kind: 'unsupported' }
    }
    return { kind: 'text', content: text, language }
  }

  return { kind: 'unsupported' }
}

export const extractPreviewPkgCtx = (data: unknown): string => {
  if (typeof data === 'string') return data
  if (data == null) return ''
  if (typeof data !== 'object') return ''

  const record = data as Record<string, unknown>

  if (record.data != null) {
    const nested = extractPreviewPkgCtx(record.data)
    if (nested) return nested
  }

  if (typeof record.pkg_ctx === 'string') return record.pkg_ctx
  if (typeof record.pkgCtx === 'string') return record.pkgCtx
  if (typeof record.content === 'string') return record.content

  return ''
}
