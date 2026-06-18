import { app, safeStorage } from 'electron'
import { randomUUID } from 'crypto'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import type {
  CreateUserModelConfigPayload,
  UpdateUserModelConfigPayload,
  UserModelConfig
} from '../../shared/types'

type StoredUserModelConfig = UserModelConfig & {
  encryptedApiKey: string
  encryption: 'safeStorage' | 'base64'
}

type ModelConfigFile = {
  models: StoredUserModelConfig[]
}

const nowIso = (): string => new Date().toISOString()

const safeJsonParse = <T>(raw: string, fallback: T): T => {
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export class UserModelService {
  private readonly configPath: string

  constructor(configPath = join(app.getPath('userData'), 'user-models.json')) {
    this.configPath = configPath
  }

  async listModels(): Promise<UserModelConfig[]> {
    const file = await this.readConfig()
    return file.models.map(({ encryptedApiKey, encryption, ...model }) => {
      void encryptedApiKey
      void encryption
      return model
    })
  }

  async createModel(payload: CreateUserModelConfigPayload): Promise<UserModelConfig> {
    const label = payload.label.trim()
    const model = payload.model.trim()
    const apiKey = payload.apiKey.trim()
    const baseUrl = payload.baseUrl?.trim()
    if (!label) throw new Error('Model name cannot be empty.')
    if (!model) throw new Error('Model ID cannot be empty.')
    if (!apiKey) throw new Error('API key cannot be empty.')

    const file = await this.readConfig()
    const now = nowIso()
    const stored: StoredUserModelConfig = {
      id: `user-${Date.now()}-${randomUUID().slice(0, 8)}`,
      label,
      model,
      provider: 'anthropic',
      ...(baseUrl ? { baseUrl } : {}),
      disableNonessentialTraffic: payload.disableNonessentialTraffic ?? true,
      createdAt: now,
      updatedAt: now,
      ...this.encryptApiKey(apiKey)
    }
    await this.writeConfig({ models: [stored, ...file.models] })
    const { encryptedApiKey, encryption, ...publicModel } = stored
    void encryptedApiKey
    void encryption
    return publicModel
  }

  async deleteModel(modelId: string): Promise<void> {
    const file = await this.readConfig()
    await this.writeConfig({ models: file.models.filter((model) => model.id !== modelId) })
  }

  async updateModel(
    modelId: string,
    payload: UpdateUserModelConfigPayload
  ): Promise<UserModelConfig> {
    const file = await this.readConfig()
    const existing = file.models.find((item) => item.id === modelId)
    if (!existing) throw new Error('Model not found.')

    const label = payload.label.trim()
    const model = payload.model.trim()
    const apiKey = payload.apiKey?.trim()
    const baseUrl = payload.baseUrl?.trim()
    if (!label) throw new Error('Model name cannot be empty.')
    if (!model) throw new Error('Model ID cannot be empty.')

    const next: StoredUserModelConfig = {
      ...existing,
      label,
      model,
      baseUrl: baseUrl || undefined,
      disableNonessentialTraffic: payload.disableNonessentialTraffic ?? true,
      updatedAt: nowIso(),
      ...(apiKey ? this.encryptApiKey(apiKey) : {})
    }
    await this.writeConfig({
      models: file.models.map((item) => (item.id === modelId ? next : item))
    })
    return this.toPublicModel(next)
  }

  async getCredentials(
    modelId: string
  ): Promise<
    | { model: string; apiKey: string; baseUrl?: string; disableNonessentialTraffic?: boolean }
    | undefined
  > {
    const file = await this.readConfig()
    const model = file.models.find((item) => item.id === modelId)
    if (!model) return undefined
    return {
      model: model.model,
      apiKey: this.decryptApiKey(model),
      baseUrl: model.baseUrl,
      disableNonessentialTraffic: model.disableNonessentialTraffic
    }
  }

  private shouldUseSafeStorage(): boolean {
    // macOS Keychain ties encryption to the app's code signature. Packaged adhoc
    // builds trigger a login-password prompt on first decrypt; skip keychain there.
    return safeStorage.isEncryptionAvailable() && !app.isPackaged
  }

  private encryptApiKey(
    apiKey: string
  ): Pick<StoredUserModelConfig, 'encryptedApiKey' | 'encryption'> {
    if (this.shouldUseSafeStorage()) {
      return {
        encryptedApiKey: safeStorage.encryptString(apiKey).toString('base64'),
        encryption: 'safeStorage'
      }
    }
    return {
      encryptedApiKey: Buffer.from(apiKey, 'utf8').toString('base64'),
      encryption: 'base64'
    }
  }

  private decryptApiKey(model: StoredUserModelConfig): string {
    const buffer = Buffer.from(model.encryptedApiKey, 'base64')
    if (model.encryption === 'safeStorage') return safeStorage.decryptString(buffer)
    return buffer.toString('utf8')
  }

  private toPublicModel(stored: StoredUserModelConfig): UserModelConfig {
    const { encryptedApiKey, encryption, ...model } = stored
    void encryptedApiKey
    void encryption
    return model
  }

  private async readConfig(): Promise<ModelConfigFile> {
    try {
      const raw = await readFile(this.configPath, 'utf8')
      const parsed = safeJsonParse<ModelConfigFile>(raw, { models: [] })
      return { models: Array.isArray(parsed.models) ? parsed.models : [] }
    } catch {
      return { models: [] }
    }
  }

  private async writeConfig(config: ModelConfigFile): Promise<void> {
    await mkdir(dirname(this.configPath), { recursive: true })
    await writeFile(this.configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8')
  }
}
