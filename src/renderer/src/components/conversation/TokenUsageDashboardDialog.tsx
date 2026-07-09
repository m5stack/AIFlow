import React, { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalContainer,
  ModalDialog,
  ModalFooter,
  ModalHeader,
  ModalHeading
} from '@heroui/react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import type { TooltipContentProps, TooltipProps } from 'recharts'
import type { TokenUsageStats } from '../../types/project'
import { formatTokenCount } from '../../utils/conversation/formatTokenUsage'

interface TokenUsageDashboardDialogProps {
  isOpen: boolean
  onClose: () => void
}

type ChartColors = {
  input: string
  output: string
  cache: string
  grid: string
  muted: string
  cursor: string
}

const EMPTY_STATS: TokenUsageStats = {
  generatedAt: '',
  retentionDays: 3,
  byModel: [],
  daily: []
}

const readCssVar = (name: string, fallback: string): string => {
  if (typeof document === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

const formatDayLabel = (dateKey: string): string => {
  const [year, month, day] = dateKey.split('-').map(Number)
  if (!year || !month || !day) return dateKey
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })
}

const readChartColors = (): ChartColors => ({
  input: readCssVar('--flow-blue', '#0ea5d4'),
  output: readCssVar('--flow-green', '#16a34a'),
  cache: readCssVar('--flow-violet', '#7c3aed'),
  grid: readCssVar('--line', '#d8e0ea'),
  muted: readCssVar('--muted', '#5c6b7f'),
  cursor: readCssVar('--ink', '#0f1724')
})

const chartValue = (count: number): number | null => (count > 0 ? count : null)

type TokenChartRow = {
  input: number | null
  output: number | null
  cache: number | null
  inputTokens: number
  outputTokens: number
  cacheTokens: number
  name?: string
  date?: string
}

const tooltipStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 8,
  fontSize: 12,
  padding: '8px 10px'
}

function TokenChartTooltip({
  active,
  label,
  payload
}: TooltipContentProps): React.JSX.Element | null {
  if (!active || !payload.length) return null

  const row = payload[0]?.payload as TokenChartRow | undefined
  if (!row) return null

  return (
    <div style={tooltipStyle}>
      {label ? <div className="mb-1 font-medium text-ink">{label}</div> : null}
      <div className="text-muted">Input: {formatTokenCount(row.inputTokens)}</div>
      <div className="text-muted">Output: {formatTokenCount(row.outputTokens)}</div>
      <div className="text-muted">Cache: {formatTokenCount(row.cacheTokens)}</div>
    </div>
  )
}

export default function TokenUsageDashboardDialog({
  isOpen,
  onClose
}: TokenUsageDashboardDialogProps): React.JSX.Element {
  const [stats, setStats] = useState<TokenUsageStats>(EMPTY_STATS)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chartColors, setChartColors] = useState<ChartColors>(() => readChartColors())

  useEffect(() => {
    if (!isOpen) return

    setChartColors(readChartColors())
    setIsLoading(true)
    setError(null)

    void window.ipc.tokenUsage
      .getStats()
      .then((nextStats) => setStats(nextStats))
      .catch((err) => {
        setStats(EMPTY_STATS)
        setError(err instanceof Error ? err.message : 'Failed to load token usage stats')
      })
      .finally(() => setIsLoading(false))
  }, [isOpen])

  const summary = useMemo(() => {
    const totalTokens = stats.byModel.reduce((sum, item) => sum + item.totalTokens, 0)
    const totalTurns = stats.byModel.reduce((sum, item) => sum + item.turns, 0)
    return {
      totalTokens,
      activeModels: stats.byModel.length,
      totalTurns
    }
  }, [stats])

  const modelChartData = useMemo(
    () =>
      stats.byModel.map((item) => ({
        name: item.label,
        input: chartValue(item.inputTokens),
        output: chartValue(item.outputTokens),
        cache: chartValue(item.cacheTokens),
        inputTokens: item.inputTokens,
        outputTokens: item.outputTokens,
        cacheTokens: item.cacheTokens
      })),
    [stats.byModel]
  )

  const dailyChartData = useMemo(
    () =>
      stats.daily.map((day) => {
        let inputTokens = 0
        let outputTokens = 0
        let cacheTokens = 0
        for (const modelStat of Object.values(day.byModel)) {
          inputTokens += modelStat.inputTokens
          outputTokens += modelStat.outputTokens
          cacheTokens += modelStat.cacheTokens
        }
        return {
          date: formatDayLabel(day.date),
          input: chartValue(inputTokens),
          output: chartValue(outputTokens),
          cache: chartValue(cacheTokens),
          inputTokens,
          outputTokens,
          cacheTokens
        }
      }),
    [stats.daily]
  )

  const hasData = stats.byModel.length > 0
  const chartTooltipProps: Pick<TooltipProps, 'content' | 'cursor'> = {
    content: TokenChartTooltip,
    cursor: { fill: chartColors.cursor, fillOpacity: 0.1 }
  }
  const chartLegendProps = {
    wrapperStyle: { fontSize: 12 },
    payload: [
      { value: 'Input', type: 'square' as const, color: chartColors.input, id: 'input' },
      { value: 'Output', type: 'square' as const, color: chartColors.output, id: 'output' },
      { value: 'Cache', type: 'square' as const, color: chartColors.cache, id: 'cache' }
    ]
  }

  return (
    <Modal>
      <Modal.Trigger
        aria-hidden
        tabIndex={-1}
        className="fixed size-0 overflow-hidden opacity-0 pointer-events-none border-0 p-0"
      />
      <ModalBackdrop
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose()
        }}
        isDismissable={!isLoading}
      >
        <ModalContainer size="lg">
          <ModalDialog className="w-[min(960px,calc(100vw-3rem))] max-w-[min(960px,calc(100vw-3rem))]!">
            <Modal.CloseTrigger />
            <ModalHeader>
              <ModalHeading className="text-lg">Token Usage</ModalHeading>
              <p className="text-[12px] text-muted">Last {stats.retentionDays} days by model</p>
            </ModalHeader>

            <ModalBody className="flex max-h-[min(72vh,620px)] flex-col gap-4 overflow-y-auto p-2">
              {error ? <div className="text-[12px] text-[#ff6b6b]">{error}</div> : null}

              {isLoading ? (
                <div className="py-10 text-center text-[13px] text-muted">Loading usage stats…</div>
              ) : !hasData ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <p className="text-[14px] font-medium text-ink">No token usage yet</p>
                  <p className="max-w-sm text-[12px] text-muted">
                    Usage is recorded after each assistant turn. Send a message to start tracking
                    tokens by model.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <SummaryCard
                      label="Total tokens"
                      value={formatTokenCount(summary.totalTokens)}
                    />
                    <SummaryCard label="Active models" value={String(summary.activeModels)} />
                    <SummaryCard label="Requests" value={String(summary.totalTurns)} />
                  </div>

                  <section className="flex flex-col gap-2">
                    <h3 className="text-[13px] font-semibold text-ink">By model</h3>
                    <div className="h-56 rounded-lg border border-line bg-surface-2 p-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={modelChartData}
                          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                          barCategoryGap="20%"
                          barGap={4}
                        >
                          <CartesianGrid
                            stroke={chartColors.grid}
                            strokeDasharray="3 3"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="name"
                            tick={{ fill: chartColors.muted, fontSize: 11 }}
                            axisLine={{ stroke: chartColors.grid }}
                            tickLine={false}
                            interval={0}
                          />
                          <YAxis
                            tick={{ fill: chartColors.muted, fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                            width={48}
                            tickFormatter={(value: number) => formatTokenCount(value)}
                          />
                          <Tooltip {...chartTooltipProps} />
                          <Legend {...chartLegendProps} />
                          <Bar
                            dataKey="input"
                            name="Input"
                            fill={chartColors.input}
                            radius={[4, 4, 0, 0]}
                            minPointSize={3}
                          />
                          <Bar
                            dataKey="output"
                            name="Output"
                            fill={chartColors.output}
                            radius={[4, 4, 0, 0]}
                            minPointSize={3}
                          />
                          <Bar
                            dataKey="cache"
                            name="Cache"
                            fill={chartColors.cache}
                            radius={[4, 4, 0, 0]}
                            minPointSize={3}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </section>

                  <section className="flex flex-col gap-2">
                    <h3 className="text-[13px] font-semibold text-ink">Daily trend</h3>
                    <div className="h-48 rounded-lg border border-line bg-surface-2 p-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={dailyChartData}
                          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                          barCategoryGap="20%"
                          barGap={4}
                        >
                          <CartesianGrid
                            stroke={chartColors.grid}
                            strokeDasharray="3 3"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="date"
                            tick={{ fill: chartColors.muted, fontSize: 11 }}
                            axisLine={{ stroke: chartColors.grid }}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fill: chartColors.muted, fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                            width={48}
                            tickFormatter={(value: number) => formatTokenCount(value)}
                          />
                          <Tooltip {...chartTooltipProps} />
                          <Legend {...chartLegendProps} />
                          <Bar
                            dataKey="input"
                            name="Input"
                            fill={chartColors.input}
                            radius={[4, 4, 0, 0]}
                            minPointSize={3}
                          />
                          <Bar
                            dataKey="output"
                            name="Output"
                            fill={chartColors.output}
                            radius={[4, 4, 0, 0]}
                            minPointSize={3}
                          />
                          <Bar
                            dataKey="cache"
                            name="Cache"
                            fill={chartColors.cache}
                            radius={[4, 4, 0, 0]}
                            minPointSize={3}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </section>

                  <section className="flex flex-col gap-2">
                    <h3 className="text-[13px] font-semibold text-ink">Details</h3>
                    <div className="overflow-x-auto rounded-lg border border-line">
                      <table className="min-w-full border-collapse text-left text-[12px]">
                        <thead className="bg-surface-2 text-muted">
                          <tr>
                            <th className="px-3 py-2 font-medium">Model</th>
                            <th className="px-3 py-2 font-medium">In</th>
                            <th className="px-3 py-2 font-medium">Out</th>
                            <th className="px-3 py-2 font-medium">Cache</th>
                            <th className="px-3 py-2 font-medium">Total</th>
                            <th className="px-3 py-2 font-medium">Requests</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.byModel.map((item) => (
                            <tr key={item.model} className="border-t border-line">
                              <td className="px-3 py-2">
                                <div className="font-medium text-ink">{item.label}</div>
                                {item.label !== item.model ? (
                                  <div className="text-[11px] text-muted">{item.model}</div>
                                ) : null}
                              </td>
                              <td className="px-3 py-2 text-ink">
                                {formatTokenCount(item.inputTokens)}
                              </td>
                              <td className="px-3 py-2 text-ink">
                                {formatTokenCount(item.outputTokens)}
                              </td>
                              <td className="px-3 py-2 text-ink">
                                {formatTokenCount(item.cacheTokens)}
                              </td>
                              <td className="px-3 py-2 font-medium text-ink">
                                {formatTokenCount(item.totalTokens)}
                              </td>
                              <td className="px-3 py-2 text-ink">{item.turns}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </>
              )}
            </ModalBody>

            <ModalFooter className="flex justify-end gap-2 px-2">
              <Button variant="ghost" className="text-[13px] cursor-pointer" onClick={onClose}>
                Close
              </Button>
            </ModalFooter>
          </ModalDialog>
        </ModalContainer>
      </ModalBackdrop>
    </Modal>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="rounded-lg border border-line bg-surface-2 px-3 py-2.5">
      <div className="text-[11px] text-muted">{label}</div>
      <div className="mt-1 text-[16px] font-semibold text-ink">{value}</div>
    </div>
  )
}
