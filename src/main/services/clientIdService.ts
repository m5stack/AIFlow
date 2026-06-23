import { app } from 'electron'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { dirname, join } from 'path'

type ClientIdFile = {
  clientId: string
}

const sanitizeClientId = (value: string): string => value.replace(/-/g, '')

const safeJsonParse = <T>(raw: string, fallback: T): T => {
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export class ClientIdService {
  private readonly configPath: string

  constructor(configPath = join(app.getPath('userData'), 'client-id.json')) {
    this.configPath = configPath
  }

  async get(): Promise<string | null> {
    try {
      const raw = await readFile(this.configPath, 'utf8')
      const parsed = safeJsonParse<ClientIdFile>(raw, { clientId: '' })
      const clientId = sanitizeClientId(String(parsed.clientId ?? '').trim())
      return clientId || null
    } catch {
      return null
    }
  }

  async set(clientId: string): Promise<void> {
    const sanitized = sanitizeClientId(clientId.trim())
    if (!sanitized) throw new Error('Client ID cannot be empty.')
    await mkdir(dirname(this.configPath), { recursive: true })
    await writeFile(
      this.configPath,
      `${JSON.stringify({ clientId: sanitized } satisfies ClientIdFile, null, 2)}\n`,
      'utf8'
    )
  }
}
