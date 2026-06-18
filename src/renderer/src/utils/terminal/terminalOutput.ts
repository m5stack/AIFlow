/** Write serial bytes to xterm without chunk-level rewriting. */
export function writeSerialOutput(data: string): string {
  return data
}

/** Use palette green so xterm re-colors lines when the theme changes. */
const TERMINAL_SYSTEM_LINE_STYLE = '\x1b[32m'

/** System/status line for WebSocket events (color follows xterm theme.green). */
export function formatTerminalSystemLine(message: string): string {
  return `${TERMINAL_SYSTEM_LINE_STYLE} ${message}\x1b[0m\r\n`
}
