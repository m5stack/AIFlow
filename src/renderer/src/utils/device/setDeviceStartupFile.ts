import { downloadCode, previewDeviceFile } from '../../api/device'
import { buildMainPyFile } from '../project/projectRunFiles'
import { parseDeviceFilePreview } from './parseDeviceFilePreview'

export interface SetDeviceStartupFileArgs {
  deviceId: string
  clientId: string
  filePath: string
  fileName: string
}

export const setDeviceStartupFile = async ({
  deviceId,
  clientId,
  filePath,
  fileName
}: SetDeviceStartupFileArgs): Promise<void> => {
  const response = await previewDeviceFile({ deviceId, clientId, filePath })
  const preview = parseDeviceFilePreview(response, fileName)

  if (preview.kind !== 'text') {
    throw new Error('Unable to read this Python file.')
  }
  if (!preview.content.trim()) {
    throw new Error('This Python file is empty.')
  }

  await downloadCode([buildMainPyFile(preview.content)], deviceId, clientId)
}
