const ESP_IMAGE_MAGIC = 0xe9
const ESP_IMAGE_HEADER_SIZE = 24

const SUPPORTED_IMAGE_OFFSETS = [0x0, 0x1000, 0x2000] as const

function hasImageHeaderAt(data: Uint8Array, offset: number): boolean {
  return data.byteLength >= offset + ESP_IMAGE_HEADER_SIZE && data[offset] === ESP_IMAGE_MAGIC
}

export function isSupportedEspFirmwareImage(data: Uint8Array): boolean {
  return SUPPORTED_IMAGE_OFFSETS.some((offset) => hasImageHeaderAt(data, offset))
}
