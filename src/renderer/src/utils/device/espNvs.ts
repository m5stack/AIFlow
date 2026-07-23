const NVS_PAGE_SIZE = 0x1000
const NVS_PAGE_HEADER_SIZE = 32
const NVS_ENTRY_BITMAP_SIZE = 32
const NVS_FIRST_ENTRY_OFFSET = NVS_PAGE_HEADER_SIZE + NVS_ENTRY_BITMAP_SIZE
const NVS_ENTRY_SIZE = 32
const NVS_MAX_ENTRIES_PER_PAGE = 126

const NVS_PAGE_STATE_ACTIVE = 0xfffffffe
const NVS_PAGE_STATE_FULL = 0xfffffffc
const NVS_PAGE_VERSION_1 = 0xff
const NVS_PAGE_VERSION_2 = 0xfe
const NVS_ENTRY_STATE_ERASED = 0
const NVS_ENTRY_STATE_WRITTEN = 2
const NVS_ENTRY_STATE_EMPTY = 3

const NVS_TYPE_U8 = 0x01
const NVS_TYPE_I8 = 0x11
const NVS_TYPE_U16 = 0x02
const NVS_TYPE_I16 = 0x12
const NVS_TYPE_U32 = 0x04
const NVS_TYPE_I32 = 0x14
const NVS_TYPE_U64 = 0x08
const NVS_TYPE_I64 = 0x18
const NVS_TYPE_STRING = 0x21
const NVS_TYPE_BLOB = 0x41
const NVS_TYPE_BLOB_DATA = 0x42
const NVS_TYPE_BLOB_INDEX = 0x48

export type EspNvsEncoding =
  | 'u8'
  | 'i8'
  | 'u16'
  | 'i16'
  | 'u32'
  | 'i32'
  | 'u64'
  | 'i64'
  | 'string'
  | 'base64'

export interface EspNvsEntry {
  key: string
  encoding: EspNvsEncoding
  value: string
}

export interface EspNvsNamespace {
  name: string
  entries: EspNvsEntry[]
}

interface ParsedPage {
  sequence: number
  data: Uint8Array
}

interface RawEntry extends EspNvsEntry {
  namespaceIndex: number
  order: number
}

interface RawBlobIndex {
  namespaceIndex: number
  key: string
  chunkStart: number
  chunkCount: number
  totalSize: number
  order: number
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let index = 0; index < table.length; index += 1) {
    let value = index
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    }
    table[index] = value >>> 0
  }
  return table
})()

function nvsCrc32(data: Uint8Array): number {
  // ESP-IDF NVS uses crc32_le(UINT32_MAX, ...). The generator's equivalent
  // starts the table loop at zero and applies the final XOR.
  let crc = 0
  for (const byte of data) {
    crc = (CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)) >>> 0
  }
  return (crc ^ 0xffffffff) >>> 0
}

function isErased(data: Uint8Array): boolean {
  return data.every((byte) => byte === 0xff)
}

function entryState(page: Uint8Array, entryIndex: number): number {
  const bitIndex = entryIndex * 2
  return (page[NVS_PAGE_HEADER_SIZE + Math.floor(bitIndex / 8)] >>> (bitIndex % 8)) & 0x03
}

function entryOffset(entryIndex: number): number {
  return NVS_FIRST_ENTRY_OFFSET + entryIndex * NVS_ENTRY_SIZE
}

function readKey(entry: Uint8Array): string {
  const keyBytes = entry.subarray(8, 24)
  const terminator = keyBytes.indexOf(0)
  const data = terminator >= 0 ? keyBytes.subarray(0, terminator) : keyBytes
  if (data.length === 0) throw new Error('NVS contains an entry with an empty key.')
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(data)
  } catch {
    throw new Error('NVS contains an invalid entry key. It may be encrypted or corrupted.')
  }
}

function validateEntryCrc(entry: Uint8Array, key: string): void {
  const crcData = new Uint8Array(28)
  crcData.set(entry.subarray(0, 4), 0)
  crcData.set(entry.subarray(8, 32), 4)
  const actual = new DataView(entry.buffer, entry.byteOffset, entry.byteLength).getUint32(4, true)
  if (actual !== nvsCrc32(crcData)) {
    throw new Error(
      `NVS entry '${key}' failed its integrity check. It may be encrypted or corrupted.`
    )
  }
}

function readPrimitiveValue(entry: Uint8Array, type: number): EspNvsEntry {
  const view = new DataView(entry.buffer, entry.byteOffset, entry.byteLength)
  const key = readKey(entry)
  switch (type) {
    case NVS_TYPE_U8:
      return { key, encoding: 'u8', value: String(view.getUint8(24)) }
    case NVS_TYPE_I8:
      return { key, encoding: 'i8', value: String(view.getInt8(24)) }
    case NVS_TYPE_U16:
      return { key, encoding: 'u16', value: String(view.getUint16(24, true)) }
    case NVS_TYPE_I16:
      return { key, encoding: 'i16', value: String(view.getInt16(24, true)) }
    case NVS_TYPE_U32:
      return { key, encoding: 'u32', value: String(view.getUint32(24, true)) }
    case NVS_TYPE_I32:
      return { key, encoding: 'i32', value: String(view.getInt32(24, true)) }
    case NVS_TYPE_U64:
      return { key, encoding: 'u64', value: view.getBigUint64(24, true).toString() }
    case NVS_TYPE_I64:
      return { key, encoding: 'i64', value: view.getBigInt64(24, true).toString() }
    default:
      throw new Error(`NVS entry '${key}' uses unsupported type 0x${type.toString(16)}.`)
  }
}

function readVariableBytes(
  page: Uint8Array,
  entryIndex: number,
  entry: Uint8Array,
  allowEmpty: boolean
): Uint8Array {
  const key = readKey(entry)
  const view = new DataView(entry.buffer, entry.byteOffset, entry.byteLength)
  const byteLength = view.getUint16(24, true)
  const span = entry[2]
  const expectedSpan = 1 + Math.ceil(byteLength / NVS_ENTRY_SIZE)
  if ((!allowEmpty && byteLength === 0) || span !== expectedSpan) {
    throw new Error(`NVS value '${key}' has an invalid length or entry span.`)
  }

  const dataOffset = entryOffset(entryIndex + 1)
  const valueBytes = page.subarray(dataOffset, dataOffset + byteLength)
  if (valueBytes.length !== byteLength) throw new Error(`NVS value '${key}' is incomplete.`)
  const expectedCrc = view.getUint32(28, true)
  if (nvsCrc32(valueBytes) !== expectedCrc) {
    throw new Error(`NVS value '${key}' failed its data integrity check.`)
  }
  return valueBytes
}

function readStringValue(page: Uint8Array, entryIndex: number, entry: Uint8Array): EspNvsEntry {
  const key = readKey(entry)
  const valueBytes = readVariableBytes(page, entryIndex, entry, false)
  if (valueBytes[valueBytes.length - 1] !== 0) {
    throw new Error(`NVS string '${key}' is not null-terminated.`)
  }

  try {
    return {
      key,
      encoding: 'string',
      value: new TextDecoder('utf-8', { fatal: true }).decode(valueBytes.subarray(0, -1))
    }
  } catch {
    throw new Error(`NVS string '${key}' contains invalid text data.`)
  }
}

function bytesToBase64(data: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < data.length; offset += chunkSize) {
    binary += String.fromCharCode(...data.subarray(offset, offset + chunkSize))
  }
  return btoa(binary)
}

function parsePages(partition: Uint8Array): ParsedPage[] {
  if (partition.byteLength < NVS_PAGE_SIZE * 3 || partition.byteLength % NVS_PAGE_SIZE !== 0) {
    throw new Error('NVS partition has an invalid size.')
  }

  const pages: ParsedPage[] = []
  const sequences = new Set<number>()
  for (let offset = 0; offset < partition.byteLength; offset += NVS_PAGE_SIZE) {
    const page = partition.subarray(offset, offset + NVS_PAGE_SIZE)
    if (isErased(page)) continue

    const view = new DataView(page.buffer, page.byteOffset, page.byteLength)
    const state = view.getUint32(0, true)
    if (state !== NVS_PAGE_STATE_ACTIVE && state !== NVS_PAGE_STATE_FULL) {
      throw new Error('NVS contains an unsupported or corrupted page state.')
    }
    const version = page[8]
    if (version !== NVS_PAGE_VERSION_1 && version !== NVS_PAGE_VERSION_2) {
      throw new Error('NVS page version is unsupported. The partition may be encrypted.')
    }
    const actualCrc = view.getUint32(28, true)
    if (actualCrc !== nvsCrc32(page.subarray(4, 28))) {
      throw new Error('NVS page header failed its integrity check.')
    }

    const sequence = view.getUint32(4, true)
    if (sequences.has(sequence)) throw new Error('NVS contains duplicate page sequence numbers.')
    sequences.add(sequence)
    pages.push({ sequence, data: page })
  }

  if (pages.length === 0) throw new Error('No readable NVS configuration was found on the device.')
  return pages.sort((left, right) => left.sequence - right.sequence)
}

function parseRawEntries(pages: ParsedPage[]): {
  namespaceNames: Map<number, string>
  entries: Map<string, RawEntry>
} {
  const namespaceNames = new Map<number, string>()
  const entries = new Map<string, RawEntry>()
  const blobChunks = new Map<string, Map<number, Uint8Array>>()
  const blobIndexes = new Map<string, RawBlobIndex>()
  let order = 0

  for (const { data: page } of pages) {
    for (let entryIndex = 0; entryIndex < NVS_MAX_ENTRIES_PER_PAGE; ) {
      const state = entryState(page, entryIndex)
      if (state === NVS_ENTRY_STATE_EMPTY) {
        entryIndex += 1
        continue
      }
      if (state !== NVS_ENTRY_STATE_WRITTEN && state !== NVS_ENTRY_STATE_ERASED) {
        throw new Error('NVS contains an entry in an invalid state.')
      }

      const offset = entryOffset(entryIndex)
      const entry = page.subarray(offset, offset + NVS_ENTRY_SIZE)
      const span = entry[2]
      const safeSpan = span >= 1 && entryIndex + span <= NVS_MAX_ENTRIES_PER_PAGE ? span : 1
      if (state === NVS_ENTRY_STATE_ERASED) {
        entryIndex += safeSpan
        continue
      }
      if (safeSpan !== span) throw new Error('NVS contains an entry with an invalid span.')
      for (let index = 1; index < span; index += 1) {
        if (entryState(page, entryIndex + index) !== NVS_ENTRY_STATE_WRITTEN) {
          throw new Error('NVS contains an incomplete multi-entry value.')
        }
      }

      const namespaceIndex = entry[0]
      const type = entry[1]
      const key = readKey(entry)
      validateEntryCrc(entry, key)
      order += 1

      let parsed: EspNvsEntry | null = null
      if (type === NVS_TYPE_STRING) {
        parsed = readStringValue(page, entryIndex, entry)
      } else if (type === NVS_TYPE_BLOB) {
        parsed = {
          key,
          encoding: 'base64',
          value: bytesToBase64(readVariableBytes(page, entryIndex, entry, true))
        }
      } else if (type === NVS_TYPE_BLOB_DATA) {
        if (namespaceIndex === 0) throw new Error(`NVS blob '${key}' has an invalid namespace.`)
        const blobKey = `${namespaceIndex}\0${key}`
        const chunks = blobChunks.get(blobKey) ?? new Map<number, Uint8Array>()
        chunks.set(entry[3], readVariableBytes(page, entryIndex, entry, true))
        blobChunks.set(blobKey, chunks)
      } else if (type === NVS_TYPE_BLOB_INDEX) {
        if (namespaceIndex === 0 || span !== 1) {
          throw new Error(`NVS blob index '${key}' is invalid.`)
        }
        const view = new DataView(entry.buffer, entry.byteOffset, entry.byteLength)
        blobIndexes.set(`${namespaceIndex}\0${key}`, {
          namespaceIndex,
          key,
          totalSize: view.getUint32(24, true),
          chunkCount: entry[28],
          chunkStart: entry[29],
          order
        })
      } else {
        parsed = readPrimitiveValue(entry, type)
      }

      if (parsed && namespaceIndex === 0) {
        if (parsed.encoding !== 'u8') {
          throw new Error(`NVS namespace '${parsed.key}' has an unsupported representation.`)
        }
        namespaceNames.set(Number(parsed.value), parsed.key)
      } else if (parsed) {
        entries.set(`${namespaceIndex}\0${parsed.key}`, { ...parsed, namespaceIndex, order })
      }
      entryIndex += span
    }
  }

  for (const [blobKey, index] of blobIndexes) {
    const chunks = blobChunks.get(blobKey)
    if (!chunks || index.chunkCount === 0) {
      throw new Error(`NVS blob '${index.key}' is missing its data chunks.`)
    }

    const parts: Uint8Array[] = []
    let totalSize = 0
    for (let offset = 0; offset < index.chunkCount; offset += 1) {
      const chunkIndex = (index.chunkStart + offset) & 0xff
      const chunk = chunks.get(chunkIndex)
      if (!chunk) throw new Error(`NVS blob '${index.key}' is missing chunk ${chunkIndex}.`)
      parts.push(chunk)
      totalSize += chunk.length
    }
    if (totalSize !== index.totalSize) {
      throw new Error(`NVS blob '${index.key}' has an invalid total length.`)
    }

    const existing = entries.get(blobKey)
    if (!existing || index.order > existing.order) {
      const data = new Uint8Array(totalSize)
      let writeOffset = 0
      for (const part of parts) {
        data.set(part, writeOffset)
        writeOffset += part.length
      }
      entries.set(blobKey, {
        namespaceIndex: index.namespaceIndex,
        key: index.key,
        encoding: 'base64',
        value: bytesToBase64(data),
        order: index.order
      })
    }
  }

  return { namespaceNames, entries }
}

export function parseEspNvsPartition(partition: Uint8Array): EspNvsNamespace[] {
  const { namespaceNames, entries } = parseRawEntries(parsePages(partition))
  const namespaces = new Map<number, EspNvsNamespace>()
  for (const [index, name] of namespaceNames) {
    namespaces.set(index, { name, entries: [] })
  }
  for (const entry of entries.values()) {
    const namespace = namespaces.get(entry.namespaceIndex)
    if (!namespace) {
      throw new Error(`NVS entry '${entry.key}' references an unknown namespace.`)
    }
    namespace.entries.push({ key: entry.key, encoding: entry.encoding, value: entry.value })
  }
  return [...namespaces.values()]
}

function csvField(value: string): string {
  return `"${value.replaceAll('"', '""')}"`
}

export function buildEspNvsCsv(namespaces: EspNvsNamespace[]): string {
  const rows = ['key,type,encoding,value']
  for (const namespace of namespaces) {
    rows.push(`${csvField(namespace.name)},namespace,,`)
    for (const entry of namespace.entries) {
      rows.push(`${csvField(entry.key)},data,${entry.encoding},${csvField(entry.value)}`)
    }
  }
  return rows.join('\n')
}
