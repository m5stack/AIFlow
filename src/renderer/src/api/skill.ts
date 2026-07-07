import { http } from './client'

const API_PATH = {
  skillList: '/preset-skills',
  downloadSkill: '/preset-skills/download'
} as const

export interface SkillItem {
  fileName: string
  size: number
  lastModified: number
  downloadUrl: string
}

export const getSkillList = async (): Promise<SkillItem[]> => {
  const { data } = await http.get(API_PATH.skillList)
  return data as SkillItem[]
}

export interface DownloadProgress {
  loaded: number
  total: number
  percent: number
}

export const downloadSkill = async (
  fileName: string,
  options?: {
    expectedSize?: number
    onProgress?: (progress: DownloadProgress) => void
  }
): Promise<Uint8Array> => {
  const { data } = await http.get<ArrayBuffer>(API_PATH.downloadSkill, {
    params: { fileName },
    responseType: 'arraybuffer',
    onDownloadProgress: (event) => {
      const total = event.total || options?.expectedSize || 0
      const loaded = event.loaded
      const percent = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0
      options?.onProgress?.({ loaded, total, percent })
    }
  })
  return new Uint8Array(data)
}
