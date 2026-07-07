import { app } from 'electron'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import type {
  TokenUsageDailyStat,
  TokenUsageModelStat,
  TokenUsageRecord,
  TokenUsageStats
} from '../../shared/types'

type TokenUsageFile = {
  records: TokenUsageRecord[]
}

const RETENTION_DAYS = 3
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000

const safeJsonParse = <T>(raw: string, fallback: T): T => {
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

const toLocalDateKey = (iso: string): string => {
  const date = new Date(iso)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const cacheTokensFromRecord = (record: TokenUsageRecord): number =>
  (record.cacheCreationInputTokens ?? 0) + (record.cacheReadInputTokens ?? 0)

const buildRecentDateKeys = (): string[] => {
  const keys: string[] = []
  const now = new Date()
  for (let offset = RETENTION_DAYS - 1; offset >= 0; offset -= 1) {
    const date = new Date(now)
    date.setDate(now.getDate() - offset)
    keys.push(toLocalDateKey(date.toISOString()))
  }
  return keys
}

export class TokenUsageService {
  private readonly configPath: string
  private writeChain: Promise<void> = Promise.resolve()

  constructor(configPath = join(app.getPath('userData'), 'token-usage.json')) {
    this.configPath = configPath
  }

  async record(record: TokenUsageRecord): Promise<void> {
    this.writeChain = this.writeChain.then(() => this.appendRecord(record))
    await this.writeChain
  }

  async getStats(): Promise<TokenUsageStats> {
    const records = await this.readAndPruneRecords()
    return this.aggregateStats(records)
  }

  private async appendRecord(record: TokenUsageRecord): Promise<void> {
    const records = await this.readAndPruneRecords()
    records.push(record)
    await this.writeRecords(records)
  }

  private async readAndPruneRecords(): Promise<TokenUsageRecord[]> {
    const cutoff = Date.now() - RETENTION_MS
    let records: TokenUsageRecord[] = []

    try {
      const raw = await readFile(this.configPath, 'utf8')
      const parsed = safeJsonParse<TokenUsageFile>(raw, { records: [] })
      records = Array.isArray(parsed.records) ? parsed.records : []
    } catch {
      records = []
    }

    const pruned = records.filter((record) => {
      const timestamp = Date.parse(record.timestamp)
      return Number.isFinite(timestamp) && timestamp >= cutoff
    })

    if (pruned.length !== records.length) {
      await this.writeRecords(pruned)
    }

    return pruned
  }

  private async writeRecords(records: TokenUsageRecord[]): Promise<void> {
    await mkdir(dirname(this.configPath), { recursive: true })
    await writeFile(
      this.configPath,
      `${JSON.stringify({ records } satisfies TokenUsageFile, null, 2)}\n`,
      'utf8'
    )
  }

  private aggregateStats(records: TokenUsageRecord[]): TokenUsageStats {
    const byModelMap = new Map<string, TokenUsageModelStat>()
    const dailyMap = new Map<string, TokenUsageDailyStat>()

    for (const record of records) {
      const model = record.model || 'unknown'
      const label = record.label?.trim() || model
      const cacheTokens = cacheTokensFromRecord(record)
      const totalTokens = record.inputTokens + record.outputTokens + cacheTokens

      const existingModel = byModelMap.get(model)
      if (existingModel) {
        existingModel.inputTokens += record.inputTokens
        existingModel.outputTokens += record.outputTokens
        existingModel.cacheTokens += cacheTokens
        existingModel.totalTokens += totalTokens
        existingModel.totalCostUsd += record.totalCostUsd ?? 0
        existingModel.turns += 1
        if (!existingModel.label && label) {
          existingModel.label = label
        }
      } else {
        byModelMap.set(model, {
          model,
          label,
          inputTokens: record.inputTokens,
          outputTokens: record.outputTokens,
          cacheTokens,
          totalTokens,
          totalCostUsd: record.totalCostUsd ?? 0,
          turns: 1
        })
      }

      const dateKey = toLocalDateKey(record.timestamp)
      const daily =
        dailyMap.get(dateKey) ??
        ({
          date: dateKey,
          byModel: {}
        } satisfies TokenUsageDailyStat)

      const dailyModel = daily.byModel[model] ?? {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0
      }
      dailyModel.inputTokens += record.inputTokens
      dailyModel.outputTokens += record.outputTokens
      dailyModel.totalTokens += totalTokens
      daily.byModel[model] = dailyModel
      dailyMap.set(dateKey, daily)
    }

    const byModel = Array.from(byModelMap.values()).sort(
      (left, right) => right.totalTokens - left.totalTokens
    )

    const daily = buildRecentDateKeys().map((date) => dailyMap.get(date) ?? { date, byModel: {} })

    return {
      generatedAt: new Date().toISOString(),
      retentionDays: RETENTION_DAYS,
      byModel,
      daily
    }
  }
}
