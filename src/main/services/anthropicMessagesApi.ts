import { DEFAULT_ANTHROPIC_BASE_URL } from '../agentEnv'

export const normalizeAnthropicBaseUrl = (url: string): string => url.trim().replace(/\/+$/, '')

export const resolveAnthropicBaseUrl = (baseUrl?: string): string =>
  baseUrl ? normalizeAnthropicBaseUrl(baseUrl) : DEFAULT_ANTHROPIC_BASE_URL

export const buildAnthropicAuthHeaders = (
  apiKey: string,
  baseUrl: string
): Record<string, string> => {
  const isCustomEndpoint = normalizeAnthropicBaseUrl(baseUrl) !== DEFAULT_ANTHROPIC_BASE_URL
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

export const parseAnthropicErrorMessage = async (response: Response): Promise<string> => {
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
