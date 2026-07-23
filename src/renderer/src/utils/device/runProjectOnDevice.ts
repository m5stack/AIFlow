import { downloadCode, pushCode } from '../../api/device'
import { requestDeviceFileTreeRefresh } from '../../stores/deviceFileTreeStore'
import { buildMainPyFile } from '../project/projectRunFiles'
import {
  transferProjectFilesToDevice,
  type ProjectDeviceTransferArgs
} from './projectDeviceTransfer'

export interface RunProjectOnDeviceArgs extends ProjectDeviceTransferArgs {
  /** When true, saves main.py under apps and runs it via the download-code API. */
  includeMainPyInDownload?: boolean
}

export interface RunProjectOnDeviceResult {
  /** main.py content that was sent; empty string means nothing was sent. */
  mainPyContent: string
  /** Whether code was actually sent to the device. */
  ran: boolean
}

/**
 * Shared "run" logic used by both the manual Run button and chat auto-run.
 * Reads main.py, uploads supporting project files, then runs main.py on the device.
 * Throws on transport failure. Returns an empty/`ran: false` result when there is no code.
 */
export const runProjectOnDevice = async (
  args: RunProjectOnDeviceArgs
): Promise<RunProjectOnDeviceResult> => {
  const { deviceId, clientId, includeMainPyInDownload = false } = args
  const { mainPyContent, transferred } = await transferProjectFilesToDevice(args, {
    includeAppFile: includeMainPyInDownload
  })

  if (!mainPyContent) {
    return { mainPyContent: '', ran: false }
  }

  try {
    if (includeMainPyInDownload) {
      await downloadCode([buildMainPyFile(mainPyContent)], deviceId, clientId)
    } else {
      await pushCode(deviceId, mainPyContent)
    }
  } finally {
    if (transferred) requestDeviceFileTreeRefresh(deviceId)
  }

  return { mainPyContent, ran: true }
}
