import axios, { isAxiosError } from 'axios'
import { parseRemoteFirmwareList, type FirmwareSelectionEntry } from '../../../shared/firmware'
import { isSupportedEspFirmwareImage } from '../utils/device/firmwareImage'

const API_PATH = {
  latest: '/firmwares/uiflow2/latest'
} as const

const REQUEST_TIMEOUT_MS = 30_000

type FirmwareRequestErrorKind =
  | 'timeout'
  | 'network'
  | 'http'
  | 'business'
  | 'response'
  | 'empty'
  | 'download'

export class FirmwareRequestError extends Error {
  readonly kind: FirmwareRequestErrorKind
  readonly status?: number

  constructor(kind: FirmwareRequestErrorKind, message: string, status?: number) {
    super(message)
    this.name = 'FirmwareRequestError'
    this.kind = kind
    this.status = status
  }
}

const burnerHttp = axios.create({
  baseURL: import.meta.env.VITE_BURNER_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { Accept: 'application/json' }
})

function responseMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') return fallback
  const record = data as Record<string, unknown>
  const message = record.msg ?? record.message ?? record.error
  return typeof message === 'string' && message.trim() ? message : fallback
}

function normalizeListRequestError(error: unknown): Error {
  if (axios.isCancel(error)) return error
  if (!isAxiosError(error)) return error instanceof Error ? error : new Error('Request failed.')
  if (error.code === 'ECONNABORTED') {
    return new FirmwareRequestError(
      'timeout',
      'The firmware list request timed out. Check the network and try again.'
    )
  }
  if (error.response) {
    const status = error.response.status
    return new FirmwareRequestError(
      'http',
      `The firmware service returned HTTP ${status}: ${responseMessage(error.response.data, error.response.statusText || 'Request failed.')}`,
      status
    )
  }
  return new FirmwareRequestError(
    'network',
    'Unable to reach the firmware service. Check the network, server address, or CORS configuration.'
  )
}

export function isFirmwareRequestCanceled(error: unknown): boolean {
  return axios.isCancel(error) || (error instanceof DOMException && error.name === 'AbortError')
}

export async function getLatestRemoteFirmwares(
  signal?: AbortSignal
): Promise<FirmwareSelectionEntry[]> {
  let payload: unknown
  try {
    const response = await burnerHttp.get(API_PATH.latest, {
      signal,
      params: { _: Date.now() }
    })
    payload = response.data
  } catch (error) {
    throw normalizeListRequestError(error)
  }

  const record =
    payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null
  if (typeof record?.code === 'number' && record.code !== 200) {
    throw new FirmwareRequestError(
      'business',
      responseMessage(payload, `The firmware service returned business code ${record.code}.`)
    )
  }

  let entries: FirmwareSelectionEntry[]
  try {
    entries = parseRemoteFirmwareList(payload)
  } catch (error) {
    throw new FirmwareRequestError(
      'response',
      `The firmware service returned invalid data: ${error instanceof Error ? error.message : 'Unknown response error.'}`
    )
  }
  if (entries.length === 0) {
    throw new FirmwareRequestError('empty', 'No online firmware is currently available.')
  }
  return entries
}

function validateDownloadUrl(value: string): URL {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new FirmwareRequestError('download', 'The firmware download URL is invalid.')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new FirmwareRequestError('download', 'The firmware download URL must use HTTP or HTTPS.')
  }
  return url
}

export async function downloadRemoteFirmware(
  downloadUrl: string,
  signal?: AbortSignal
): Promise<Uint8Array> {
  const controller = new AbortController()
  let timedOut = false
  const abortFromCaller = (): void => controller.abort(signal?.reason)
  if (signal?.aborted) controller.abort(signal.reason)
  else signal?.addEventListener('abort', abortFromCaller, { once: true })
  const timeout = window.setTimeout(() => {
    timedOut = true
    controller.abort()
  }, REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(validateDownloadUrl(downloadUrl), {
      signal: controller.signal,
      cache: 'no-store'
    })
    if (!response.ok) {
      throw new FirmwareRequestError(
        'http',
        `Firmware download failed with HTTP ${response.status}.`,
        response.status
      )
    }
    const data = new Uint8Array(await response.arrayBuffer())
    if (data.byteLength === 0) {
      throw new FirmwareRequestError('download', 'The downloaded firmware is empty.')
    }
    if (!isSupportedEspFirmwareImage(data)) {
      throw new FirmwareRequestError(
        'download',
        'The downloaded file is not a supported ESP firmware image (expected an image header at 0x0, 0x1000, or 0x2000).'
      )
    }
    return data
  } catch (error) {
    if (timedOut) {
      throw new FirmwareRequestError(
        'timeout',
        'The firmware download timed out. Check the network and try again.'
      )
    }
    if (signal?.aborted || isFirmwareRequestCanceled(error)) throw error
    if (error instanceof FirmwareRequestError) throw error
    throw new FirmwareRequestError(
      'network',
      'Unable to download the firmware. Check the network, download URL, or CORS configuration.'
    )
  } finally {
    window.clearTimeout(timeout)
    signal?.removeEventListener('abort', abortFromCaller)
  }
}
