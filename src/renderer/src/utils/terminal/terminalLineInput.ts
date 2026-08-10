const DEFAULT_HISTORY_LIMIT = 100

const KEY_SEQUENCE = {
  up: '\x1b[A',
  down: '\x1b[B',
  right: '\x1b[C',
  left: '\x1b[D',
  home: '\x1b[H',
  end: '\x1b[F',
  alternateHome: '\x1b[1~',
  alternateEnd: '\x1b[4~',
  delete: '\x1b[3~'
} as const

export interface TerminalLineSnapshot {
  value: string
  cursor: number
}

export type TerminalLineAction =
  | ({ type: 'render' } & TerminalLineSnapshot)
  | { type: 'submit'; value: string }

const segmentText = (value: string): string[] => {
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  return Array.from(segmenter.segment(value), ({ segment }) => segment)
}

/** Local line-editing state for xterm. All cursor positions are grapheme indexes. */
export class TerminalLineEditor {
  private value: string[] = []
  private cursor = 0
  private history: string[] = []
  private historyIndex: number | null = null
  private historyDraft: string[] = []
  private lastInputWasCr = false

  constructor(private readonly historyLimit = DEFAULT_HISTORY_LIMIT) {}

  snapshot(): TerminalLineSnapshot {
    return { value: this.value.join(''), cursor: this.cursor }
  }

  reset(options: { clearHistory?: boolean } = {}): TerminalLineSnapshot {
    this.value = []
    this.cursor = 0
    this.historyIndex = null
    this.historyDraft = []
    this.lastInputWasCr = false
    if (options.clearHistory) this.history = []
    return this.snapshot()
  }

  handleInput(data: string): TerminalLineAction[] {
    const actions: TerminalLineAction[] = []
    let textStart = 0

    const flushText = (end: number): void => {
      if (end <= textStart) return
      this.insert(data.slice(textStart, end))
    }

    for (let index = 0; index < data.length; ) {
      const sequence = this.matchKeySequence(data, index)
      if (sequence) {
        flushText(index)
        this.handleKeySequence(sequence)
        index += sequence.length
        textStart = index
        continue
      }

      const char = data[index]
      if (char === '\r' || char === '\n' || char === '\x08' || char === '\x7f') {
        flushText(index)

        if (char === '\r' || char === '\n') {
          if (!(char === '\n' && this.lastInputWasCr)) {
            actions.push(this.submit())
          }
          this.lastInputWasCr = char === '\r'
        } else {
          this.lastInputWasCr = false
          this.backspace()
        }

        index += 1
        textStart = index
        continue
      }

      this.lastInputWasCr = false
      index += 1
    }

    flushText(data.length)
    actions.push({ type: 'render', ...this.snapshot() })
    return actions
  }

  private matchKeySequence(data: string, start: number): string | null {
    if (data[start] !== '\x1b') return null
    const knownSequence = Object.values(KEY_SEQUENCE).find((sequence) =>
      data.startsWith(sequence, start)
    )
    if (knownSequence) return knownSequence

    const csiSequence = data.slice(start + 1).match(/^\[[0-9;?]*[ -/]*[@-~]/)?.[0]
    return csiSequence ? `\x1b${csiSequence}` : '\x1b'
  }

  private handleKeySequence(sequence: string): void {
    this.lastInputWasCr = false
    switch (sequence) {
      case KEY_SEQUENCE.up:
        this.previousHistory()
        break
      case KEY_SEQUENCE.down:
        this.nextHistory()
        break
      case KEY_SEQUENCE.left:
        this.cursor = Math.max(0, this.cursor - 1)
        break
      case KEY_SEQUENCE.right:
        this.cursor = Math.min(this.value.length, this.cursor + 1)
        break
      case KEY_SEQUENCE.home:
      case KEY_SEQUENCE.alternateHome:
        this.cursor = 0
        break
      case KEY_SEQUENCE.end:
      case KEY_SEQUENCE.alternateEnd:
        this.cursor = this.value.length
        break
      case KEY_SEQUENCE.delete:
        this.detachFromHistory()
        if (this.cursor < this.value.length) this.value.splice(this.cursor, 1)
        break
    }
  }

  private insert(text: string): void {
    const graphemes = segmentText(text.replaceAll('\x1b', ''))
    if (graphemes.length === 0) return
    this.detachFromHistory()
    this.value.splice(this.cursor, 0, ...graphemes)
    this.cursor += graphemes.length
  }

  private backspace(): void {
    if (this.cursor === 0) return
    this.detachFromHistory()
    this.value.splice(this.cursor - 1, 1)
    this.cursor -= 1
  }

  private submit(): TerminalLineAction {
    const submitted = this.value.join('')
    if (submitted && this.history.at(-1) !== submitted) {
      this.history.push(submitted)
      if (this.history.length > this.historyLimit) this.history.shift()
    }
    this.value = []
    this.cursor = 0
    this.historyIndex = null
    this.historyDraft = []
    return { type: 'submit', value: submitted }
  }

  private previousHistory(): void {
    if (this.history.length === 0) return
    if (this.historyIndex === null) {
      this.historyDraft = [...this.value]
      this.historyIndex = this.history.length - 1
    } else {
      this.historyIndex = Math.max(0, this.historyIndex - 1)
    }
    this.loadHistoryValue(this.history[this.historyIndex])
  }

  private nextHistory(): void {
    if (this.historyIndex === null) return
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex += 1
      this.loadHistoryValue(this.history[this.historyIndex])
      return
    }
    this.value = [...this.historyDraft]
    this.cursor = this.value.length
    this.historyIndex = null
    this.historyDraft = []
  }

  private loadHistoryValue(value: string): void {
    this.value = segmentText(value)
    this.cursor = this.value.length
  }

  private detachFromHistory(): void {
    if (this.historyIndex === null) return
    this.historyIndex = null
    this.historyDraft = []
  }
}

interface PendingEcho {
  value: string
  index: number
  phase: 'value' | 'terminator' | 'optionalLf'
}

/** Removes a submitted line when the device echoes it back, including split frames. */
export class TerminalEchoFilter {
  private pending: PendingEcho[] = []
  private held = ''

  expect(value: string): void {
    this.pending.push({ value, index: 0, phase: value ? 'value' : 'terminator' })
  }

  reset(): void {
    this.pending = []
    this.held = ''
  }

  filter(data: string): string {
    let index = 0

    while (index < data.length) {
      const expected = this.pending[0]
      if (!expected) return data.slice(index)

      const char = data[index]
      if (expected.phase === 'value') {
        if (char === expected.value[expected.index]) {
          this.held += char
          expected.index += 1
          index += 1
          if (expected.index === expected.value.length) expected.phase = 'terminator'
          continue
        }
        return this.releaseHeldAndReset() + data.slice(index)
      }

      if (expected.phase === 'terminator') {
        if (char === '\r') {
          this.held += char
          expected.phase = 'optionalLf'
          index += 1
          continue
        }
        if (char === '\n') {
          this.held = ''
          this.pending.shift()
          index += 1
          continue
        }
        return this.releaseHeldAndReset() + data.slice(index)
      }

      this.held = ''
      this.pending.shift()
      if (char === '\n') {
        index += 1
      }
    }

    return ''
  }

  private releaseHeldAndReset(): string {
    const held = this.held
    this.reset()
    return held
  }
}
