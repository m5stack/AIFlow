import { app } from 'electron'
import { randomUUID } from 'crypto'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import type { CreateMcpServerPayload, McpServerItem } from '../../shared/types'

type McpServerConfigFile = {
  servers: McpServerItem[]
}

type SdkMcpServerConfig =
  | {
      type?: 'stdio'
      command: string
      args?: string[]
      env?: Record<string, string>
    }
  | {
      type: 'sse'
      url: string
      headers?: Record<string, string>
    }
  | {
      type: 'http'
      url: string
      headers?: Record<string, string>
    }

const nowIso = (): string => new Date().toISOString()

const safeJsonParse = <T>(raw: string, fallback: T): T => {
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

const normalizeName = (name: string): string => name.trim()

const normalizeArgs = (args?: string[]): string[] | undefined => {
  if (!args?.length) return undefined
  const normalized = args.map((arg) => arg.trim()).filter(Boolean)
  return normalized.length > 0 ? normalized : undefined
}

const normalizeStringMap = (value?: Record<string, string>): Record<string, string> | undefined => {
  if (!value) return undefined
  const entries = Object.entries(value)
    .map(([key, entryValue]) => [key.trim(), entryValue.trim()] as const)
    .filter(([key, entryValue]) => key && entryValue)
  return entries.length > 0 ? Object.fromEntries(entries) : undefined
}

export class McpService {
  private readonly configPath: string
  private serversCache: McpServerItem[] | null = null

  constructor(configPath = join(app.getPath('userData'), 'mcp-servers.json')) {
    this.configPath = configPath
  }

  private async loadServers(): Promise<McpServerItem[]> {
    if (this.serversCache !== null) return this.serversCache
    const file = await this.readConfig()
    this.serversCache = file.servers
    return this.serversCache
  }

  private async persistServers(servers: McpServerItem[]): Promise<void> {
    this.serversCache = servers
    await this.writeConfig({ servers })
  }

  async listServers(): Promise<McpServerItem[]> {
    return [...(await this.loadServers())]
  }

  async createServer(payload: CreateMcpServerPayload): Promise<McpServerItem[]> {
    const name = normalizeName(payload.name)
    if (!name) throw new Error('Server name cannot be empty.')

    const servers = await this.loadServers()
    if (servers.some((server) => server.name === name)) {
      throw new Error(`MCP server "${name}" already exists.`)
    }

    const now = nowIso()
    const server: McpServerItem = {
      id: `mcp-${Date.now()}-${randomUUID().slice(0, 8)}`,
      name,
      transport: payload.transport,
      createdAt: now,
      updatedAt: now
    }

    if (payload.transport === 'stdio') {
      const command = payload.command?.trim()
      if (!command) throw new Error('Command is required for stdio MCP servers.')
      server.command = command
      server.args = normalizeArgs(payload.args)
      server.env = normalizeStringMap(payload.env)
    } else {
      const url = payload.url?.trim()
      if (!url) throw new Error('URL is required for remote MCP servers.')
      server.url = url
      server.headers = normalizeStringMap(payload.headers)
    }

    await this.persistServers([...servers, server])
    return this.listServers()
  }

  async deleteServer(serverId: string): Promise<McpServerItem[]> {
    const servers = await this.loadServers()
    const nextServers = servers.filter((server) => server.id !== serverId)
    if (nextServers.length === servers.length) {
      throw new Error('MCP server not found.')
    }
    await this.persistServers(nextServers)
    return this.listServers()
  }

  async toSdkMcpServers(): Promise<Record<string, SdkMcpServerConfig>> {
    const servers = await this.listServers()
    const result: Record<string, SdkMcpServerConfig> = {}

    for (const server of servers) {
      if (server.transport === 'stdio') {
        if (!server.command) continue
        result[server.name] = {
          type: 'stdio',
          command: server.command,
          ...(server.args?.length ? { args: server.args } : {}),
          ...(server.env ? { env: server.env } : {})
        }
        continue
      }

      if (!server.url) continue
      if (server.transport === 'sse') {
        result[server.name] = {
          type: 'sse',
          url: server.url,
          ...(server.headers ? { headers: server.headers } : {})
        }
        continue
      }

      result[server.name] = {
        type: 'http',
        url: server.url,
        ...(server.headers ? { headers: server.headers } : {})
      }
    }

    return result
  }

  private async readConfig(): Promise<McpServerConfigFile> {
    try {
      const raw = await readFile(this.configPath, 'utf8')
      const parsed = safeJsonParse<McpServerConfigFile>(raw, { servers: [] })
      return { servers: Array.isArray(parsed.servers) ? parsed.servers : [] }
    } catch {
      return { servers: [] }
    }
  }

  private async writeConfig(config: McpServerConfigFile): Promise<void> {
    await mkdir(dirname(this.configPath), { recursive: true })
    await writeFile(this.configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8')
  }
}
