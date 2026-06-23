import { DEFAULT_ANTHROPIC_BASE_URL } from '../agentEnv'
import type { ModelConnectionTestResult } from '../../shared/types'

const TEST_TIMEOUT_MS = 60_000

const normalizeBaseUrl = (url: string): string => url.trim().replace(/\/+$/, '')

const buildAuthHeaders = (apiKey: string, baseUrl: string): Record<string, string> => {
  const isCustomEndpoint = normalizeBaseUrl(baseUrl) !== DEFAULT_ANTHROPIC_BASE_URL
  if (isCustomEndpoint) {
    return {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  }
  return {
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'Content-Type': 'application/json'
  }
}

const parseErrorMessage = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as {
      error?: { message?: string }
      message?: string
    }
    return body.error?.message || body.message || response.statusText || 'Request failed.'
  } catch {
    return response.statusText || 'Request failed.'
  }
}

export async function testModelConnectionRequest(params: {
  model: string
  apiKey: string
  baseUrl?: string
}): Promise<ModelConnectionTestResult> {
  const baseUrl = params.baseUrl
    ? normalizeBaseUrl(params.baseUrl)
    : DEFAULT_ANTHROPIC_BASE_URL
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers: buildAuthHeaders(params.apiKey, baseUrl),
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

    const message = await parseErrorMessage(response)
    return {
      ok: false,
      status: response.status,
      message: response.status === 401 || response.status === 403 ? `Authentication failed: ${message}` : message
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
