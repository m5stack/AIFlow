const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/** MicroPython REPL ready marker; init retry stops only after this appears in device output. */
export const REPL_PROMPT_MARKER = '>>>'

export function hasReplPrompt(output: string): boolean {
  return output.includes(REPL_PROMPT_MARKER)
}

/** Wait after init send; retry if no REPL prompt within this window. */
export const REPL_INIT_RETRY_MS = 3000

export interface ReplInitSendOptions {
  flush?: () => Promise<void>
  /** Delay before the first send. */
  leadInMs?: number
  /** Retry interval when no device response is observed. */
  retryWaitMs?: number
  hasResponse?: () => boolean
  shouldContinue?: () => boolean
}

const sendReplInitPayload = async (
  _send: (data: string) => void,
  _flush: () => Promise<void>
): Promise<void> => {
  // send('\r\x03\x03')
  // await flush()
  // await delay(400)
  // send('\r')
  // await flush()
}

/** Break into MicroPython REPL; retry until >>> or shouldContinue is false. */
export async function initReplSession(
  send: (data: string) => void,
  options: ReplInitSendOptions = {}
): Promise<void> {
  const flush = options.flush ?? (async () => {})
  const retryWaitMs = options.retryWaitMs ?? REPL_INIT_RETRY_MS
  const hasResponse = options.hasResponse ?? (() => false)
  const shouldContinue = options.shouldContinue ?? (() => true)
  const leadInMs = options.leadInMs ?? 3000

  let isFirst = true
  while (shouldContinue()) {
    if (isFirst && leadInMs > 0) {
      await delay(leadInMs)
      isFirst = false
    } else {
      isFirst = false
    }

    await sendReplInitPayload(send, flush)
    if (hasResponse() || !shouldContinue()) return

    await delay(retryWaitMs)
    if (hasResponse() || !shouldContinue()) return
  }
}
