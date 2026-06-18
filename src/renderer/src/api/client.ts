/**
 * M5 Cloud HTTP client (remote REST).
 * For local main-process calls use `window.ipc` (Electron IPC via preload).
 */
import axios, { isAxiosError } from 'axios'

export const DEFAULT_TIMEOUT = 15000

function extractMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data
    if (typeof data === 'string' && data.trim()) return data
    if (data && typeof data === 'object') {
      const record = data as Record<string, unknown>
      const message = record.message ?? record.error ?? record.msg
      if (typeof message === 'string' && message.trim()) return message
    }
    if (error.response?.statusText) return error.response.statusText
    if (error.message) return error.message
  }
  if (error instanceof Error) return error.message
  return 'Request failed'
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: DEFAULT_TIMEOUT
})

http.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(new Error(extractMessage(err)))
)
