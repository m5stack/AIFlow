import { useEffect, useImperativeHandle, useRef, forwardRef } from 'react'
import { toast } from '@heroui/react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { writeSerialOutput } from '../../utils/terminal/terminalOutput'
import {
  TerminalEchoFilter,
  TerminalLineEditor,
  type TerminalLineSnapshot
} from '../../utils/terminal/terminalLineInput'
import { useThemeStore } from '../../stores/themeStore'
import type { RealtimeTerminalStatus } from '../../hooks/useRealtimeTerminal'
import './terminal-view.css'

const XTERM_THEMES = {
  dark: {
    background: '#070d15',
    foreground: '#c7d2df',
    cursor: '#4ade80',
    cursorAccent: '#070d15',
    selectionBackground: 'rgba(74, 222, 128, 0.22)',
    selectionForeground: '#fafafa',
    black: '#18181b',
    red: '#f87171',
    green: '#86efac',
    yellow: '#ffd166',
    blue: '#60a5fa',
    magenta: '#c084fc',
    cyan: '#22d3ee',
    white: '#e4e4e7',
    brightBlack: '#71717a',
    brightRed: '#fca5a5',
    brightGreen: '#86efac',
    brightYellow: '#fde047',
    brightBlue: '#93c5fd',
    brightMagenta: '#d8b4fe',
    brightCyan: '#67e8f9',
    brightWhite: '#fafafa'
  },
  light: {
    background: '#f5f8fc',
    foreground: '#1f2937',
    cursor: '#16a34a',
    cursorAccent: '#f5f8fc',
    selectionBackground: 'rgba(22, 163, 74, 0.18)',
    selectionForeground: '#111827',
    black: '#374151',
    red: '#dc2626',
    green: '#306a48',
    yellow: '#ca8a04',
    blue: '#2563eb',
    magenta: '#9333ea',
    cyan: '#0891b2',
    white: '#f3f4f6',
    brightBlack: '#6b7280',
    brightRed: '#ef4444',
    brightGreen: '#22c55e',
    brightYellow: '#eab308',
    brightBlue: '#3b82f6',
    brightMagenta: '#a855f7',
    brightCyan: '#06b6d4',
    brightWhite: '#ffffff'
  }
} as const

/** MicroPython REPL control characters. */
const MP_CTRL = {
  interrupt: '\x03', // Ctrl-C
  softReboot: '\x04', // Ctrl-D
  pasteMode: '\x05', // Ctrl-E
  quit: '\x1d' // Ctrl-]
} as const

const CONTROL_INPUTS = new Set<string>(Object.values(MP_CTRL))

type RendererTask = (done: () => void) => void

/** Serializes xterm writes so local redraws cannot race device output. */
class TerminalInputRenderer {
  private tasks: RendererTask[] = []
  private busy = false
  private disposed = false
  private hasInputAnchor = false
  private snapshot: TerminalLineSnapshot = { value: '', cursor: 0 }

  constructor(private readonly term: XTerm) {}

  render(snapshot: TerminalLineSnapshot): void {
    this.snapshot = snapshot
    this.enqueue((done) => this.redraw(done))
  }

  commit(value: string): void {
    this.enqueue((done) => {
      const clearDraft = this.hasInputAnchor ? '\x1b8\x1b[J' : ''
      this.hasInputAnchor = false
      this.term.write(`${clearDraft}${value}\r\n`, done)
    })
  }

  writeOutput(data: string): void {
    if (!data) return
    this.enqueue((done) => {
      if (!this.hasInputAnchor) {
        this.term.write(data, done)
        return
      }

      this.term.write(`\x1b8\x1b[J${data}\x1b7`, () => this.redraw(done))
    })
  }

  clearInput(options: { clearScreen?: boolean } = {}): void {
    this.snapshot = { value: '', cursor: 0 }
    this.enqueue((done) => {
      const clearDraft = this.hasInputAnchor ? '\x1b8\x1b[J' : ''
      this.hasInputAnchor = false
      this.term.write(clearDraft, () => {
        if (options.clearScreen) this.term.clear()
        done()
      })
    })
  }

  dispose(): void {
    this.disposed = true
    this.tasks = []
  }

  private redraw(done: () => void): void {
    const graphemes = Array.from(
      new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(this.snapshot.value),
      ({ segment }) => segment
    )
    const prefix = graphemes.slice(0, this.snapshot.cursor).join('')
    const suffix = graphemes.slice(this.snapshot.cursor).join('')
    const resetToAnchor = this.hasInputAnchor ? '\x1b8\x1b[J' : '\x1b7'
    this.hasInputAnchor = true

    this.term.write(resetToAnchor, () => {
      this.term.write(prefix, () => {
        const marker = this.term.registerMarker(0)
        const targetColumn = this.term.buffer.active.cursorX

        this.term.write(suffix, () => {
          if (!marker || marker.isDisposed) {
            done()
            return
          }

          const currentLine = this.term.buffer.active.baseY + this.term.buffer.active.cursorY
          const lineDelta = marker.line - currentLine
          const verticalMove =
            lineDelta < 0 ? `\x1b[${-lineDelta}A` : lineDelta > 0 ? `\x1b[${lineDelta}B` : ''
          const moveToCursor = `${verticalMove}\x1b[${targetColumn + 1}G`
          marker.dispose()
          this.term.write(moveToCursor, done)
        })
      })
    })
  }

  private enqueue(task: RendererTask): void {
    if (this.disposed) return
    this.tasks.push(task)
    this.runNext()
  }

  private runNext(): void {
    if (this.busy || this.disposed) return
    const task = this.tasks.shift()
    if (!task) return
    this.busy = true
    task(() => {
      this.busy = false
      this.runNext()
    })
  }
}

const fitTerminalSafely = (fitAddon: FitAddon | null): void => {
  try {
    fitAddon?.fit()
  } catch {
    // container may have zero size during layout
  }
}

const scheduleTerminalFit = (fitAddon: FitAddon | null): void => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fitTerminalSafely(fitAddon)
    })
  })
}

const applyTerminalBackground = (
  outerEl: HTMLDivElement | null,
  viewportEl: HTMLDivElement | null,
  theme: keyof typeof XTERM_THEMES
): void => {
  const bg = XTERM_THEMES[theme].background
  if (outerEl) outerEl.style.backgroundColor = bg
  if (viewportEl) viewportEl.style.backgroundColor = bg
}

export interface TerminalViewHandle {
  clear: () => void
  clearInput: () => void
  focus: () => void
  write: (data: string) => void
}

interface TerminalViewProps {
  status: RealtimeTerminalStatus
  onSendData: (data: string) => void
  onRegisterDataHandler: (handler: ((data: string) => void) | null) => void
}

const TerminalView = forwardRef<TerminalViewHandle, TerminalViewProps>(function TerminalView(
  { status, onSendData, onRegisterDataHandler },
  ref
) {
  const connected = status === 'connected'
  const resolvedTheme = useThemeStore((s) => s.resolved)
  const outerContainerRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const onSendDataRef = useRef(onSendData)
  const connectedRef = useRef(connected)
  connectedRef.current = connected
  const writeOutputRef = useRef<((data: string) => void) | null>(null)
  const lineEditorRef = useRef<TerminalLineEditor | null>(null)
  const echoFilterRef = useRef<TerminalEchoFilter | null>(null)
  const inputRendererRef = useRef<TerminalInputRenderer | null>(null)

  useEffect(() => {
    onSendDataRef.current = onSendData
  }, [onSendData])

  const onRegisterDataHandlerRef = useRef(onRegisterDataHandler)

  useEffect(() => {
    onRegisterDataHandlerRef.current = onRegisterDataHandler
  }, [onRegisterDataHandler])

  useImperativeHandle(ref, () => ({
    clear: () => {
      lineEditorRef.current?.reset()
      echoFilterRef.current?.reset()
      inputRendererRef.current?.clearInput({ clearScreen: true })
    },
    clearInput: () => {
      lineEditorRef.current?.reset()
      echoFilterRef.current?.reset()
      inputRendererRef.current?.clearInput()
    },
    focus: () => {
      fitTerminalSafely(fitAddonRef.current)
      termRef.current?.focus()
    },
    write: (data: string) => {
      writeOutputRef.current?.(data)
    }
  }))

  useEffect(() => {
    if (!containerRef.current) return

    const term = new XTerm({
      cursorBlink: true,
      convertEol: true,
      disableStdin: true,
      fontSize: 12,
      lineHeight: 1,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace',
      letterSpacing: 0,
      scrollback: 5000,
      theme: XTERM_THEMES[useThemeStore.getState().resolved]
    })

    const fitAddon = new FitAddon()
    const lineEditor = new TerminalLineEditor()
    const echoFilter = new TerminalEchoFilter()
    const inputRenderer = new TerminalInputRenderer(term)
    term.loadAddon(fitAddon)
    term.open(containerRef.current)
    fitAddonRef.current = fitAddon
    termRef.current = term
    lineEditorRef.current = lineEditor
    echoFilterRef.current = echoFilter
    inputRendererRef.current = inputRenderer

    applyTerminalBackground(
      outerContainerRef.current,
      containerRef.current,
      useThemeStore.getState().resolved
    )
    scheduleTerminalFit(fitAddon)

    const processLineInput = (data: string): void => {
      if (!data) return
      for (const action of lineEditor.handleInput(data)) {
        if (action.type === 'render') {
          inputRenderer.render(action)
          continue
        }

        inputRenderer.commit(action.value)
        echoFilter.expect(action.value)
        onSendDataRef.current(`${action.value}\r`)
      }
    }

    const sendControlInput = (data: string): void => {
      lineEditor.reset()
      echoFilter.reset()
      inputRenderer.clearInput()
      onSendDataRef.current(data)
    }

    term.onData((data) => {
      if (!connectedRef.current) return

      let textStart = 0
      for (let index = 0; index < data.length; index += 1) {
        if (!CONTROL_INPUTS.has(data[index])) continue
        processLineInput(data.slice(textStart, index))
        sendControlInput(data[index])
        textStart = index + 1
      }
      processLineInput(data.slice(textStart))
    })

    const copyTerminalSelection = async (): Promise<void> => {
      const selection = term.getSelection()
      if (!selection) return

      try {
        await navigator.clipboard.writeText(selection)
      } catch {
        toast.danger('Failed to copy terminal selection.')
      }
    }

    term.attachCustomKeyEventHandler((event) => {
      if (event.type !== 'keydown') return true

      const key = event.key.toLowerCase()
      const isCtrlChord = event.ctrlKey && !event.metaKey && !event.altKey
      const isWindowsOrLinuxCopy =
        window.electron.process.platform !== 'darwin' &&
        isCtrlChord &&
        key === 'c' &&
        (event.shiftKey || term.hasSelection())

      if (isWindowsOrLinuxCopy) {
        event.preventDefault()
        void copyTerminalSelection()
        return false
      }

      if (!connectedRef.current || !isCtrlChord) return true

      if (event.key === ']') {
        event.preventDefault()
        sendControlInput(MP_CTRL.quit)
        return false
      }

      const ctrlKeyMap: Record<string, string> = {
        c: MP_CTRL.interrupt,
        d: MP_CTRL.softReboot,
        e: MP_CTRL.pasteMode
      }
      const ctrlChar = ctrlKeyMap[key]
      if (ctrlChar) {
        event.preventDefault()
        sendControlInput(ctrlChar)
        return false
      }

      return true
    })

    const writeToTerminal = (data: string): void => {
      inputRenderer.writeOutput(writeSerialOutput(echoFilter.filter(data)))
    }

    writeOutputRef.current = writeToTerminal
    onRegisterDataHandlerRef.current?.(writeToTerminal)

    let fitRaf = 0
    const resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(fitRaf)
      fitRaf = requestAnimationFrame(() => {
        fitTerminalSafely(fitAddon)
      })
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      cancelAnimationFrame(fitRaf)
      resizeObserver.disconnect()
      inputRenderer.dispose()
      writeOutputRef.current = null
      onRegisterDataHandlerRef.current?.(null)
      term.dispose()
      termRef.current = null
      fitAddonRef.current = null
      lineEditorRef.current = null
      echoFilterRef.current = null
      inputRendererRef.current = null
    }
  }, [])

  useEffect(() => {
    const term = termRef.current
    if (term) {
      term.options.theme = XTERM_THEMES[resolvedTheme]
      term.refresh(0, term.rows - 1)
    }
    applyTerminalBackground(outerContainerRef.current, containerRef.current, resolvedTheme)
  }, [resolvedTheme])

  useEffect(() => {
    const term = termRef.current
    if (!term) return

    term.options.disableStdin = !connected

    if (!connected) {
      lineEditorRef.current?.reset({ clearHistory: true })
      echoFilterRef.current?.reset()
      inputRendererRef.current?.clearInput()
      return
    }

    scheduleTerminalFit(fitAddonRef.current)

    requestAnimationFrame(() => {
      term.focus()
    })
  }, [connected, status])

  const handleContainerClick = (): void => {
    fitTerminalSafely(fitAddonRef.current)
    termRef.current?.focus()
  }

  return (
    <div
      ref={outerContainerRef}
      className="webrepl-terminal-container"
      onClick={handleContainerClick}
    >
      <div ref={containerRef} className="webrepl-terminal-viewport" />
    </div>
  )
})

export default TerminalView
