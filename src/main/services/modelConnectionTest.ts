import type { ModelConnectionTestResult } from '../../shared/types'
import {
  buildAnthropicAuthHeaders,
  parseAnthropicErrorMessage,
  resolveAnthropicBaseUrl
} from './anthropicMessagesApi'

const TEST_TIMEOUT_MS = 60_000

export async function testModelConnectionRequest(params: {
  model: string
  apiKey: string
  baseUrl?: string
}): Promise<ModelConnectionTestResult> {
  const baseUrl = resolveAnthropicBaseUrl(params.baseUrl)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers: buildAnthropicAuthHeaders(params.apiKey, baseUrl),
      body: JSON.stringify({
        model: params.model,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }]
      }),
      signal: controller.signal
    })

    if (response.ok) {
      return { ok: true, message: 'Connection successful' }
    }

    const message = await parseAnthropicErrorMessage(response)
    return {
      ok: false,
      status: response.status,
      message:
        response.status === 401 || response.status === 403
          ? `Authentication failed: ${message}`
          : message
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, message: 'Connection timed out after 1 minute.' }
    }
    const message = error instanceof Error ? error.message : 'Network error.'
    return { ok: false, message: `Connection failed: ${message}` }
  } finally {
    clearTimeout(timeoutId)
  }
}
