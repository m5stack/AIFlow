import { app } from 'electron'
import { randomUUID } from 'crypto'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import type {
  CreatePromptTemplatePayload,
  PromptTemplate,
  UpdatePromptTemplatePayload
} from '../../shared/types'
import {
  PROMPT_TEMPLATE_CONTENT_MAX_LENGTH,
  PROMPT_TEMPLATE_NAME_MAX_LENGTH
} from '../../shared/promptTemplates'

type PromptTemplateFile = {
  templates: PromptTemplate[]
}

const nowIso = (): string => new Date().toISOString()

const safeJsonParse = <T>(raw: string, fallback: T): T => {
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

const validatePayload = (payload: CreatePromptTemplatePayload): CreatePromptTemplatePayload => {
  const name = payload.name.trim()
  const content = payload.content.trim()
  if (!name) throw new Error('Template name cannot be empty.')
  if (!content) throw new Error('Prompt cannot be empty.')
  if (name.length > PROMPT_TEMPLATE_NAME_MAX_LENGTH) {
    throw new Error(`Template name cannot exceed ${PROMPT_TEMPLATE_NAME_MAX_LENGTH} characters.`)
  }
  if (content.length > PROMPT_TEMPLATE_CONTENT_MAX_LENGTH) {
    throw new Error(`Prompt cannot exceed ${PROMPT_TEMPLATE_CONTENT_MAX_LENGTH} characters.`)
  }
  return { name, content }
}

const isPromptTemplate = (value: unknown): value is PromptTemplate => {
  if (!value || typeof value !== 'object') return false
  const template = value as Partial<PromptTemplate>
  return (
    typeof template.id === 'string' &&
    typeof template.name === 'string' &&
    typeof template.content === 'string' &&
    template.name.trim().length > 0 &&
    template.name.length <= PROMPT_TEMPLATE_NAME_MAX_LENGTH &&
    template.content.trim().length > 0 &&
    template.content.length <= PROMPT_TEMPLATE_CONTENT_MAX_LENGTH &&
    typeof template.createdAt === 'string' &&
    typeof template.updatedAt === 'string'
  )
}

export class PromptTemplateService {
  private readonly configPath: string

  constructor(configPath = join(app.getPath('userData'), 'prompt-templates.json')) {
    this.configPath = configPath
  }

  async listTemplates(): Promise<PromptTemplate[]> {
    return (await this.readConfig()).templates
  }

  async getTemplate(templateId: string): Promise<PromptTemplate | undefined> {
    return (await this.readConfig()).templates.find((template) => template.id === templateId)
  }

  async createTemplate(payload: CreatePromptTemplatePayload): Promise<PromptTemplate> {
    const normalized = validatePayload(payload)
    const file = await this.readConfig()
    if (
      file.templates.some(
        (template) => template.name.toLowerCase() === normalized.name.toLowerCase()
      )
    ) {
      throw new Error('A prompt template with this name already exists.')
    }
    const timestamp = nowIso()
    const template: PromptTemplate = {
      id: `prompt-${Date.now()}-${randomUUID().slice(0, 8)}`,
      ...normalized,
      createdAt: timestamp,
      updatedAt: timestamp
    }
    await this.writeConfig({ templates: [template, ...file.templates] })
    return template
  }

  async updateTemplate(payload: UpdatePromptTemplatePayload): Promise<PromptTemplate> {
    const normalized = validatePayload(payload)
    const file = await this.readConfig()
    const existing = file.templates.find((template) => template.id === payload.id)
    if (!existing) throw new Error('Prompt template not found.')
    if (
      file.templates.some(
        (template) =>
          template.id !== payload.id &&
          template.name.toLowerCase() === normalized.name.toLowerCase()
      )
    ) {
      throw new Error('A prompt template with this name already exists.')
    }

    const updated: PromptTemplate = {
      ...existing,
      ...normalized,
      updatedAt: nowIso()
    }
    await this.writeConfig({
      templates: file.templates.map((template) => (template.id === payload.id ? updated : template))
    })
    return updated
  }

  async deleteTemplate(templateId: string): Promise<void> {
    const file = await this.readConfig()
    if (!file.templates.some((template) => template.id === templateId)) return
    await this.writeConfig({
      templates: file.templates.filter((template) => template.id !== templateId)
    })
  }

  private async readConfig(): Promise<PromptTemplateFile> {
    try {
      const raw = await readFile(this.configPath, 'utf8')
      const parsed = safeJsonParse<PromptTemplateFile>(raw, { templates: [] })
      return {
        templates: Array.isArray(parsed.templates) ? parsed.templates.filter(isPromptTemplate) : []
      }
    } catch {
      return { templates: [] }
    }
  }

  private async writeConfig(config: PromptTemplateFile): Promise<void> {
    await mkdir(dirname(this.configPath), { recursive: true })
    await writeFile(this.configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8')
  }
}
