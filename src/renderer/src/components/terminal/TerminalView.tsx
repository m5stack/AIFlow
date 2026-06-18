import { useEffect, useImperativeHandle, useRef, forwardRef } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { writeSerialOutput } from '../../utils/terminal/terminalOutput'
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

/** xterm sends DEL on Backspace; MicroPython serial REPL expects BS. */
const normalizeInputForDevice = (data: string): string => data.replace(/\x7f/g, '\x08')

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
  focus: () => void
  write: (data: string) => void
}

interface TerminalViewProps {
  status: RealtimeTerminalStatus
  onSendData: (data: string) => void
  onRegisterDataHandler: (handler: ((data: string) => void) | null) => void
}

const TerminalView = forwardRef<TerminalViewHandle, TerminalViewProps>(
  function TerminalView({ status, onSendData, onRegisterDataHandler }, ref) {
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

    useEffect(() => {
      onSendDataRef.current = onSendData
    }, [onSendData])

    const onRegisterDataHandlerRef = useRef(onRegisterDataHandler)

    useEffect(() => {
      onRegisterDataHandlerRef.current = onRegisterDataHandler
    }, [onRegisterDataHandler])

    useImperativeHandle(ref, () => ({
      clear: () => {
        termRef.current?.clear()
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
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace',
        letterSpacing: 0,
        scrollback: 5000,
        theme: XTERM_THEMES[useThemeStore.getState().resolved]
      })

      const fitAddon = new FitAddon()
      term.loadAddon(fitAddon)
      term.open(containerRef.current)
      fitAddonRef.current = fitAddon
      termRef.current = term

      applyTerminalBackground(
        outerContainerRef.current,
        containerRef.current,
        useThemeStore.getState().resolved
      )
      scheduleTerminalFit(fitAddon)

      term.onData((data) => {
        if (!connectedRef.current) return
        onSendDataRef.current(normalizeInputForDevice(data))
      })

      term.attachCustomKeyEventHandler((event) => {
        if (!connectedRef.current || event.type !== 'keydown') return true
        if (!event.ctrlKey || event.metaKey || event.altKey) return true

        if (event.key === ']') {
          event.preventDefault()
          onSendDataRef.current(MP_CTRL.quit)
          return false
        }

        const key = event.key.toLowerCase()
        const ctrlKeyMap: Record<string, string> = {
          c: MP_CTRL.interrupt,
          d: MP_CTRL.softReboot,
          e: MP_CTRL.pasteMode
        }
        const ctrlChar = ctrlKeyMap[key]
        if (ctrlChar) {
          event.preventDefault()
          onSendDataRef.current(ctrlChar)
          return false
        }

        return true
      })

      const writeToTerminal = (data: string): void => {
        term.write(writeSerialOutput(data))
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
        writeOutputRef.current = null
        onRegisterDataHandlerRef.current?.(null)
        term.dispose()
        termRef.current = null
        fitAddonRef.current = null
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

      if (!connected) return

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
      <div ref={outerContainerRef} className="webrepl-terminal-container" onClick={handleContainerClick}>
        <div ref={containerRef} className="webrepl-terminal-viewport" />
      </div>
    )
  }
)

export default TerminalView
