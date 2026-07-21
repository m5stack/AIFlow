import type { ChatTokenUsage } from '../../shared/types'
import {
  buildAnthropicAuthHeaders,
  parseAnthropicErrorMessage,
  resolveAnthropicBaseUrl
} from './anthropicMessagesApi'

const TITLE_TIMEOUT_MS = 20_000
const TITLE_MAX_INPUT_CHARS = 4_000

type GenerateConversationTitleRequest = {
  model: string
  apiKey: string
  baseUrl?: string
  userMessage: string
  assistantMessage: string
}

export type GeneratedConversationTitle = {
  title: string
  tokenUsage: ChatTokenUsage
}

const truncateInput = (content: string): string => content.slice(0, TITLE_MAX_INPUT_CHARS)

const truncateUnicode = (content: string, maxLength: number): string =>
  Array.from(content).slice(0, maxLength).join('')

export const normalizeConversationTitle = (content: string): string => {
  const normalized = content
    .replace(/^[\s#*`"'“”‘’]+|[\s#*`"'“”‘’]+$/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[.!?。！？:：;；]+$/g, '')
    .trim()
  return truncateUnicode(normalized, 48).trim()
}

export const buildFallbackConversationTitle = (content: string): string => {
  const normalized = content.replace(/\s+/g, ' ').trim()
  if (!normalized) return 'New chat'
  const truncated = truncateUnicode(normalized, 40).trim()
  return Array.from(normalized).length > 40 ? `${truncated}…` : truncated
}

export async function generateConversationTitleRequest(
  params: GenerateConversationTitleRequest
): Promise<GeneratedConversationTitle> {
  const baseUrl = resolveAnthropicBaseUrl(params.baseUrl)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TITLE_TIMEOUT_MS)

  try {
    const response = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers: buildAnthropicAuthHeaders(params.apiKey, baseUrl),
      body: JSON.stringify({
        model: params.model,
        max_tokens: 48,
        temperature: 0,
        system:
          'Create a concise title for this conversation. Use the same language as the user. Return only the title, with no quotes, markdown, explanation, or trailing punctuation. Aim for 3-6 words.',
        messages: [
          {
            role: 'user',
            content: [
              'First user message:',
              truncateInput(params.userMessage),
              '',
              'First assistant response:',
              truncateInput(params.assistantMessage)
            ].join('\n')
          }
        ]
      }),
      signal: controller.signal
    })

    if (!response.ok) {
      throw new Error(await parseAnthropicErrorMessage(response))
    }

    const body = (await response.json()) as {
      content?: Array<{ type?: string; text?: string }>
      usage?: { input_tokens?: number; output_tokens?: number }
    }
    const title =
      body.content
        ?.filter((block) => block.type === 'text' && typeof block.text === 'string')
        .map((block) => block.text?.trim() ?? '')
        .filter(Boolean)
        .join(' ') ?? ''
    if (!title) throw new Error('The model returned an empty conversation title.')

    return {
      title,
      tokenUsage: {
        inputTokens: body.usage?.input_tokens ?? 0,
        outputTokens: body.usage?.output_tokens ?? 0
      }
    }
  } finally {
    clearTimeout(timeoutId)
  }
}
