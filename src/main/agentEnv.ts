export const DEFAULT_ANTHROPIC_BASE_URL = 'https://api.anthropic.com'

type ModelCredentials = {
  apiKey: string
  baseUrl?: string
  disableNonessentialTraffic?: boolean
}

const normalizeBaseUrl = (url: string): string => url.trim().replace(/\/+$/, '')

export const buildAgentSdkEnv = (modelCredentials?: ModelCredentials): Record<string, string> => {
  const env = { ...process.env } as Record<string, string>
  // Never inherit a base URL from the system/global Claude config; the app
  // always decides the endpoint explicitly below.
  delete env.ANTHROPIC_BASE_URL

  const baseUrl = modelCredentials?.baseUrl
    ? normalizeBaseUrl(modelCredentials.baseUrl)
    : DEFAULT_ANTHROPIC_BASE_URL
  const isCustomEndpoint = baseUrl !== DEFAULT_ANTHROPIC_BASE_URL

  if (modelCredentials?.apiKey) {
    delete env.ANTHROPIC_API_KEY
    delete env.ANTHROPIC_AUTH_TOKEN
  }

  return {
    ...env,
    ANTHROPIC_BASE_URL: baseUrl,
    ...(modelCredentials?.apiKey && isCustomEndpoint
      ? { ANTHROPIC_AUTH_TOKEN: modelCredentials.apiKey }
      : {}),
    ...(modelCredentials?.apiKey && !isCustomEndpoint
      ? { ANTHROPIC_API_KEY: modelCredentials.apiKey }
      : {}),
    ...(modelCredentials?.disableNonessentialTraffic
      ? { CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1' }
      : {}),
    CLAUDE_AGENT_SDK_CLIENT_APP: 'AIFlow/beta'
  }
}
