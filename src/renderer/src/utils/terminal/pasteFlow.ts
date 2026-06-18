/** MicroPython REPL control bytes (matches test client in aaaa). */
export const MP_CTRL = {
  INTERRUPT: '\x03',
  SOFT_REBOOT: '\x04',
  PASTE_MODE: '\x05'
} as const

/** Device paste-mode prompt fragment; output containing this allows queue flush. */
export const PASTE_READY_MARKER = '=== '

const CR = '\r'
const LF = '\n'

/**
 * Client-side MicroPython paste-mode state machine.
 * Mirrors PasteFlow in the Python realtime terminal client.
 */
export class PasteFlow {
  private active = false
  private ready = false
  private line = ''
  private queue: string[] = []
  private lastWasCr = false

  /** Exit paste mode and discard buffered paste input. */
  private deactivate(): void {
    this.active = false
    this.ready = false
    this.line = ''
    this.queue = []
    this.lastWasCr = false
  }

  reset(): void {
    this.deactivate()
  }

  isActive(): boolean {
    return this.active
  }

  observeOutput(data: string): void {
    if (this.active && data.includes(PASTE_READY_MARKER)) {
      this.ready = true
    }
  }

  /**
   * Process keyboard/paste input. Returns bytes to send immediately (non-paste path).
   */
  handleInput(payload: string): string {
    let direct = ''

    for (const char of payload) {
      if (!this.active) {
        direct += char
        if (char === MP_CTRL.PASTE_MODE) {
          this.active = true
          this.ready = false
          this.line = ''
          this.queue = []
          this.lastWasCr = false
        }
        continue
      }

      if (char === MP_CTRL.INTERRUPT) {
        this.deactivate()
        direct += char
        continue
      }

      if (char === MP_CTRL.SOFT_REBOOT) {
        if (this.line.length > 0) {
          this.queue.push(this.line + CR)
          this.line = ''
        }
        this.queue.push(MP_CTRL.SOFT_REBOOT)
        this.lastWasCr = false
        continue
      }

      if (char === LF || char === CR) {
        if (char === LF && this.lastWasCr) {
          this.lastWasCr = false
          continue
        }
        this.queue.push(this.line + CR)
        this.line = ''
        this.lastWasCr = char === CR
        continue
      }

      this.lastWasCr = false
      this.line += char
    }

    return direct
  }

  /** Send one queued paste chunk when the device prompt is ready. */
  flushReady(send: (payload: string) => void): void {
    if (!this.active || !this.ready || this.queue.length === 0) return

    const payload = this.queue.shift()
    if (!payload) return

    send(payload)
    this.ready = false

    if (payload === MP_CTRL.SOFT_REBOOT) {
      this.deactivate()
    }
  }
}

/** True when payload may enter paste mode (contains Ctrl-E). */
export function mayEnterPasteMode(payload: string): boolean {
  return payload.includes(MP_CTRL.PASTE_MODE)
}

/** Chunk large direct keyboard payloads like the Python terminal client. */
export function sendKeyboardPayload(
  send: (chunk: string) => void,
  payload: string,
  pasteThreshold = 16,
  chunkSize = 64
): void {
  if (payload.length >= pasteThreshold) {
    for (let start = 0; start < payload.length; start += chunkSize) {
      send(payload.slice(start, start + chunkSize))
    }
    return
  }

  if (payload.length > 0) {
    send(payload)
  }
}
