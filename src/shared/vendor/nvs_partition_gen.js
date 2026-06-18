#!/usr/bin/env node
/*
 * ESP-IDF NVS partition generation tool, ported from nvs_partition_gen.py.
 *
 * Generates NVS-compatible partition binaries from CSV input.
 */

'use strict'

const crypto = require('crypto')
const fs = require('fs')
const os = require('os')
const path = require('path')

const VERSION1_PRINT = 'V1 - Multipage Blob Support Disabled'
const VERSION2_PRINT = 'V2 - Multipage Blob Support Enabled'

function reverseHexBytes(addrTmp) {
  const parts = []
  for (let i = 0; i < addrTmp.length; i += 2) {
    parts.push(addrTmp.slice(i, i + 2))
  }
  return parts.reverse().join('')
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i += 1) {
    let c = i
    for (let j = 0; j < 8; j += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c >>> 0
  }
  return table
})()

function crc32(data, seed = 0) {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data)
  let crc = (seed ^ 0xffffffff) >>> 0
  for (const byte of buf) {
    crc = (CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)) >>> 0
  }
  return (crc ^ 0xffffffff) >>> 0
}

function parseIntAuto(value) {
  const text = String(value).trim().toLowerCase()
  if (/^[+-]?0x[0-9a-f]+$/.test(text)) return Number.parseInt(text, 16)
  if (/^[+-]?0b[01]+$/.test(text)) {
    const sign = text.startsWith('-') ? -1 : 1
    return sign * Number.parseInt(text.replace(/^[+-]?0b/, ''), 2)
  }
  if (/^[+-]?0o[0-7]+$/.test(text)) {
    const sign = text.startsWith('-') ? -1 : 1
    return sign * Number.parseInt(text.replace(/^[+-]?0o/, ''), 8)
  }
  return Number.parseInt(text, 10)
}

function ensureDir(dir) {
  if (dir && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

class PageFullError extends Error {
  constructor() {
    super()
    this.name = 'PageFullError'
  }
}

class InputError extends Error {
  constructor(message) {
    super(message)
    this.name = 'InputError'
  }
}

class InsufficientSizeError extends Error {
  constructor(message) {
    super(message)
    this.name = 'InsufficientSizeError'
  }
}

class Page {
  static U8 = 0x01
  static I8 = 0x11
  static U16 = 0x02
  static I16 = 0x12
  static U32 = 0x04
  static I32 = 0x14
  static U64 = 0x08
  static I64 = 0x18
  static SZ = 0x21
  static BLOB = 0x41
  static BLOB_DATA = 0x42
  static BLOB_IDX = 0x48
  static HEADER_SIZE = 32
  static BITMAPARRAY_OFFSET = 32
  static BITMAPARRAY_SIZE_IN_BYTES = 32
  static FIRST_ENTRY_OFFSET = 64
  static SINGLE_ENTRY_SIZE = 32
  static CHUNK_ANY = 0xff
  static ACTIVE = 0xfffffffe
  static FULL = 0xfffffffc
  static VERSION1 = 0xff
  static VERSION2 = 0xfe
  static PAGE_PARAMS = {
    max_size: 4096,
    max_blob_size: {
      [Page.VERSION1]: 1984,
      [Page.VERSION2]: 4000
    },
    max_entries: 126
  }

  constructor(pageNum, version, isReservedPage = false) {
    this.entryNum = 0
    this.bitmapArray = Buffer.alloc(0)
    this.version = version
    this.pageBuf = Buffer.alloc(Page.PAGE_PARAMS.max_size, 0xff)
    if (!isReservedPage) {
      this.bitmapArray = this.createBitmapArray()
      this.setHeader(pageNum, version)
    }
  }

  setHeader(pageNum, version) {
    const pageHeader = Buffer.alloc(32, 0xff)
    pageHeader.writeUInt32LE(Page.ACTIVE, 0)
    pageHeader.writeUInt32LE(pageNum >>> 0, 4)
    if (version === Page.VERSION2) pageHeader[8] = Page.VERSION2
    else if (version === Page.VERSION1) pageHeader[8] = Page.VERSION1
    const crc = crc32(pageHeader.subarray(4, 28), 0xffffffff)
    pageHeader.writeUInt32LE(crc, 28)
    pageHeader.copy(this.pageBuf, 0)
  }

  createBitmapArray() {
    return Buffer.alloc(32, 0xff)
  }

  writeBitmapArray() {
    const bitnum = this.entryNum * 2
    const byteIdx = Math.floor(bitnum / 8)
    const bitOffset = bitnum & 7
    this.bitmapArray[byteIdx] &= ~(1 << bitOffset)
    this.bitmapArray.copy(this.pageBuf, Page.BITMAPARRAY_OFFSET, 0, Page.BITMAPARRAY_SIZE_IN_BYTES)
  }

  normalizeXtsKey(keyInput) {
    if (Buffer.isBuffer(keyInput)) return keyInput
    if (typeof keyInput === 'string') return Buffer.from(keyInput, 'hex')
    return Buffer.from(keyInput)
  }

  encryptEntry(dataHex, tweakHex, encrKey) {
    const plainText = Buffer.from(dataHex, 'hex')
    const tweak = Buffer.from(tweakHex, 'hex')
    const key = this.normalizeXtsKey(encrKey)
    const cipherName = key.length === 32 ? 'aes-128-xts' : 'aes-256-xts'
    const cipher = crypto.createCipheriv(cipherName, key, tweak)
    cipher.setAutoPadding(false)
    return Buffer.concat([cipher.update(plainText), cipher.final()])
  }

  encryptData(dataInput, noOfEntries, nvsObj) {
    const encryptedChunks = []
    const dataLenNeeded = 64
    const tweakLenNeeded = 32
    const initTweakVal = '0'
    const initDataVal = 'f'
    const relAddr = nvsObj.pageNum * Page.PAGE_PARAMS.max_size + Page.FIRST_ENTRY_OFFSET

    let dataBuf
    if (Buffer.isBuffer(dataInput) && dataInput.length === noOfEntries * 32) {
      dataBuf = dataInput
    } else {
      dataBuf = Buffer.alloc(noOfEntries * 32, 0xff)
      Buffer.from(dataInput).copy(dataBuf, 0)
    }

    const dataHex = dataBuf.toString('hex')
    let entryNo = this.entryNum
    let startIdx = 0
    let endIdx = startIdx + 64

    for (let i = 0; i < noOfEntries; i += 1) {
      const offset = entryNo * Page.SINGLE_ENTRY_SIZE
      const addr = (relAddr + offset).toString(16)
      let tweakVal
      if (addr.length > 2) {
        const addrTmp = addr.length % 2 === 0 ? addr : initTweakVal + addr
        const tweakTmp = reverseHexBytes(addrTmp)
        tweakVal = tweakTmp + initTweakVal.repeat(tweakLenNeeded - tweakTmp.length)
      } else {
        tweakVal = addr + initTweakVal.repeat(tweakLenNeeded - addr.length)
      }

      const dataBytes = dataHex.slice(startIdx, endIdx)
      const dataVal = dataBytes + initDataVal.repeat(dataLenNeeded - dataBytes.length)
      encryptedChunks.push(this.encryptEntry(dataVal, tweakVal, nvsObj.encrKey))
      startIdx = endIdx
      endIdx = startIdx + 64
      entryNo += 1
    }

    return Buffer.concat(encryptedChunks)
  }

  writeEntryToBuf(data, entryCount, nvsObj) {
    let writeData = Buffer.isBuffer(data) ? data : Buffer.from(data)
    if (nvsObj.encrypt) {
      writeData = this.encryptData(writeData, entryCount, nvsObj)
    }

    const dataOffset = Page.FIRST_ENTRY_OFFSET + Page.SINGLE_ENTRY_SIZE * this.entryNum
    writeData.copy(this.pageBuf, dataOffset)

    for (let i = 0; i < entryCount; i += 1) {
      this.writeBitmapArray()
      this.entryNum += 1
    }
  }

  setCrcHeader(entryStruct) {
    const crcData = Buffer.alloc(28)
    entryStruct.copy(crcData, 0, 0, 4)
    entryStruct.copy(crcData, 4, 8, 32)
    const crc = crc32(crcData, 0xffffffff)
    entryStruct.writeUInt32LE(crc, 4)
    return entryStruct
  }

  writeVarlenBinaryData(
    entryStruct,
    nsIndex,
    key,
    data,
    dataSize,
    totalEntryCount,
    encoding,
    nvsObj
  ) {
    let self = this
    let chunkStart = 0
    let chunkCount = 0
    let offset = 0
    let remainingSize = dataSize
    const dataBuf = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8')

    while (true) {
      const tailroom = (Page.PAGE_PARAMS.max_entries - self.entryNum - 1) * Page.SINGLE_ENTRY_SIZE
      if (tailroom < 0) throw new Error('Page overflow!!')

      const chunkSize = tailroom < remainingSize ? tailroom : remainingSize
      remainingSize -= chunkSize

      entryStruct[1] = Page.BLOB_DATA
      const datachunkRoundedSize = (chunkSize + 31) & ~31
      const datachunkEntryCount = datachunkRoundedSize / 32
      const datachunkTotalEntryCount = datachunkEntryCount + 1
      entryStruct[2] = datachunkTotalEntryCount
      entryStruct[3] = chunkStart + chunkCount

      const dataChunk = dataBuf.subarray(offset, offset + chunkSize)
      entryStruct.writeUInt16LE(chunkSize, 24)
      entryStruct.writeUInt32LE(crc32(dataChunk, 0xffffffff), 28)

      entryStruct = self.setCrcHeader(entryStruct)
      self.writeEntryToBuf(entryStruct, 1, nvsObj)
      self.writeEntryToBuf(dataChunk, datachunkEntryCount, nvsObj)

      chunkCount += 1

      if (remainingSize || tailroom - chunkSize < Page.SINGLE_ENTRY_SIZE) {
        nvsObj.createNewPage()
        self = nvsObj.curPage
      }

      offset += chunkSize

      if (!remainingSize) {
        entryStruct.fill(0xff, 24, 32)
        entryStruct[1] = Page.BLOB_IDX
        entryStruct[2] = 1
        entryStruct[3] = Page.CHUNK_ANY
        entryStruct.writeUInt32LE(dataSize, 24)
        entryStruct[28] = chunkCount
        entryStruct[29] = chunkStart
        entryStruct = self.setCrcHeader(entryStruct)
        self.writeEntryToBuf(entryStruct, 1, nvsObj)
        break
      }
    }

    return entryStruct
  }

  writeSinglePageEntry(entryStruct, data, datalen, dataEntryCount, nvsObj) {
    const dataBuf = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8')
    entryStruct.writeUInt16LE(datalen, 24)
    entryStruct.writeUInt32LE(crc32(dataBuf, 0xffffffff), 28)
    entryStruct = this.setCrcHeader(entryStruct)
    this.writeEntryToBuf(entryStruct, 1, nvsObj)
    this.writeEntryToBuf(dataBuf, dataEntryCount, nvsObj)
  }

  writeVarlenData(key, data, encoding, nsIndex, nvsObj) {
    const datalen = Buffer.isBuffer(data) ? data.length : String(data).length
    const maxBlobSize = Page.PAGE_PARAMS.max_blob_size[this.version]
    const blobLimitApplies = this.version === Page.VERSION1 || encoding === 'string'

    if (blobLimitApplies && datalen > maxBlobSize) {
      throw new InputError(
        ` Input File: Size (${datalen}) exceeds max allowed length \`${maxBlobSize}\` bytes for key \`${key}\`.`
      )
    }

    const roundedSize = (datalen + 31) & ~31
    const dataEntryCount = roundedSize / 32
    const totalEntryCount = dataEntryCount + 1

    if (this.entryNum >= Page.PAGE_PARAMS.max_entries) {
      throw new PageFullError()
    } else if (this.entryNum + totalEntryCount >= Page.PAGE_PARAMS.max_entries) {
      if (!(this.version === Page.VERSION2 && ['hex2bin', 'binary', 'base64'].includes(encoding))) {
        throw new PageFullError()
      }
    }

    let entryStruct = Buffer.alloc(32, 0xff)
    entryStruct[0] = nsIndex
    if (this.version === Page.VERSION2) {
      if (encoding === 'string') entryStruct[2] = dataEntryCount + 1
      entryStruct[3] = Page.CHUNK_ANY
    } else {
      entryStruct[2] = dataEntryCount + 1
    }

    entryStruct.fill(0x00, 8, 24)
    Buffer.from(key).copy(entryStruct, 8, 0, Buffer.byteLength(key))

    if (encoding === 'string') entryStruct[1] = Page.SZ
    else if (['hex2bin', 'binary', 'base64'].includes(encoding)) entryStruct[1] = Page.BLOB

    if (this.version === Page.VERSION2 && ['hex2bin', 'binary', 'base64'].includes(encoding)) {
      entryStruct = this.writeVarlenBinaryData(
        entryStruct,
        nsIndex,
        key,
        data,
        datalen,
        totalEntryCount,
        encoding,
        nvsObj
      )
    } else {
      this.writeSinglePageEntry(entryStruct, data, datalen, dataEntryCount, nvsObj)
    }
  }

  writePrimitiveData(key, data, encoding, nsIndex, nvsObj) {
    if (this.entryNum >= Page.PAGE_PARAMS.max_entries) throw new PageFullError()

    const entryStruct = Buffer.alloc(32, 0xff)
    entryStruct[0] = nsIndex
    entryStruct[2] = 0x01
    entryStruct[3] = Page.CHUNK_ANY
    entryStruct.fill(0x00, 8, 24)
    Buffer.from(key).copy(entryStruct, 8, 0, Buffer.byteLength(key))

    if (encoding === 'u8') {
      entryStruct[1] = Page.U8
      entryStruct.writeUInt8(data, 24)
    } else if (encoding === 'i8') {
      entryStruct[1] = Page.I8
      entryStruct.writeInt8(data, 24)
    } else if (encoding === 'u16') {
      entryStruct[1] = Page.U16
      entryStruct.writeUInt16LE(data, 24)
    } else if (encoding === 'i16') {
      entryStruct[1] = Page.I16
      entryStruct.writeInt16LE(data, 24)
    } else if (encoding === 'u32') {
      entryStruct[1] = Page.U32
      entryStruct.writeUInt32LE(data >>> 0, 24)
    } else if (encoding === 'i32') {
      entryStruct[1] = Page.I32
      entryStruct.writeInt32LE(data, 24)
    } else if (encoding === 'u64') {
      entryStruct[1] = Page.U64
      entryStruct.writeBigUInt64LE(BigInt(data), 24)
    } else if (encoding === 'i64') {
      entryStruct[1] = Page.I64
      entryStruct.writeBigInt64LE(BigInt(data), 24)
    }

    const crcData = Buffer.alloc(28)
    entryStruct.copy(crcData, 0, 0, 4)
    entryStruct.copy(crcData, 4, 8, 32)
    entryStruct.writeUInt32LE(crc32(crcData, 0xffffffff), 4)
    this.writeEntryToBuf(entryStruct, 1, nvsObj)
  }

  getData() {
    return this.pageBuf
  }
}

class NVS {
  constructor(inputSize, version, encrypt = false, keyInput = null) {
    this.size = inputSize
    this.encrypt = encrypt
    this.encrKey = encrypt ? keyInput : null
    this.namespaceIdx = 0
    this.pageNum = -1
    this.pages = []
    this.version = version
    this.curPage = this.createNewPage(version)
  }

  close() {
    while (true) {
      try {
        this.createNewPage()
      } catch (err) {
        if (!(err instanceof InsufficientSizeError)) throw err
        this.size = null
        this.createNewPage(undefined, true)
        break
      }
    }
    return this.getBinaryData()
  }

  createNewPage(version = null, isReservedPage = false) {
    if (this.pages.length) {
      const currPageState = this.curPage.pageBuf.readUInt32LE(0)
      if (currPageState === Page.ACTIVE) this.curPage.pageBuf.writeUInt32LE(Page.FULL, 0)
    }

    version = this.version
    if (this.size === 0) {
      throw new InsufficientSizeError(
        'Error: Size parameter is less than the size of data in csv.Please increase size.'
      )
    }
    if (!isReservedPage && this.size !== null) this.size -= Page.PAGE_PARAMS.max_size
    this.pageNum += 1
    const newPage = new Page(this.pageNum, version, isReservedPage)
    this.pages.push(newPage)
    this.curPage = newPage
    return newPage
  }

  writeNamespace(key) {
    this.namespaceIdx += 1
    try {
      this.curPage.writePrimitiveData(key, this.namespaceIdx, 'u8', 0, this)
    } catch (err) {
      if (!(err instanceof PageFullError)) throw err
      const newPage = this.createNewPage()
      newPage.writePrimitiveData(key, this.namespaceIdx, 'u8', 0, this)
    }
  }

  writeEntry(key, value, encoding) {
    let dataValue = value
    let enc = encoding.toLowerCase()

    if (enc === 'hex2bin') {
      dataValue = String(dataValue).trim()
      if (dataValue.length % 2 !== 0)
        throw new InputError(`${key}: Invalid data length. Should be multiple of 2.`)
      dataValue = Buffer.from(dataValue, 'hex')
    } else if (enc === 'base64') {
      dataValue = Buffer.from(String(dataValue), 'base64')
    } else if (enc === 'string') {
      if (Buffer.isBuffer(dataValue)) dataValue = dataValue.toString()
      dataValue = `${dataValue}\0`
    }

    const varlenEncodings = new Set(['string', 'binary', 'hex2bin', 'base64'])
    const primitiveEncodings = new Set(['u8', 'i8', 'u16', 'i16', 'u32', 'i32', 'u64', 'i64'])

    if (varlenEncodings.has(enc)) {
      try {
        this.curPage.writeVarlenData(key, dataValue, enc, this.namespaceIdx, this)
      } catch (err) {
        if (!(err instanceof PageFullError)) throw err
        const newPage = this.createNewPage()
        newPage.writeVarlenData(key, dataValue, enc, this.namespaceIdx, this)
      }
    } else if (primitiveEncodings.has(enc)) {
      const numericValue = enc.endsWith('64') ? BigInt(String(dataValue)) : parseIntAuto(dataValue)
      try {
        this.curPage.writePrimitiveData(key, numericValue, enc, this.namespaceIdx, this)
      } catch (err) {
        if (!(err instanceof PageFullError)) throw err
        const newPage = this.createNewPage()
        newPage.writePrimitiveData(key, numericValue, enc, this.namespaceIdx, this)
      }
    } else {
      throw new InputError(`${enc}: Unsupported encoding`)
    }
  }

  getBinaryData() {
    return Buffer.concat(this.pages.map((page) => page.getData()))
  }
}

function nvsOpen(inputSize, version = null, isEncrypt = false, key = null) {
  return new NVS(inputSize, version, isEncrypt, key)
}

function writeEntry(nvsInstance, key, datatype, encoding, value) {
  let entryValue = value
  if (datatype === 'file') {
    let absFilePath = entryValue
    if (!path.isAbsolute(entryValue)) absFilePath = path.join(process.cwd(), entryValue)
    entryValue = fs.readFileSync(absFilePath)
  }

  if (datatype === 'namespace') nvsInstance.writeNamespace(key)
  else nvsInstance.writeEntry(key, entryValue, encoding)
}

function checkSize(size) {
  const inputSizeRaw = parseIntAuto(size)
  if (!Number.isFinite(inputSizeRaw) || Number.isNaN(inputSizeRaw)) {
    throw new Error(`Invalid size: ${size}`)
  }
  if (inputSizeRaw % 4096 !== 0) throw new Error('Size of partition must be multiple of 4096')
  const inputSize = inputSizeRaw - Page.PAGE_PARAMS.max_size
  if (inputSize < 2 * Page.PAGE_PARAMS.max_size) {
    throw new Error('Minimum NVS partition size needed is 0x3000 bytes.')
  }
  return inputSize
}

function setTargetFilepath(outdir, filepath) {
  const binExt = '.bin'
  let targetOutdir = outdir.replace(/^~(?=$|[/\\])/, os.homedir())
  let targetFilepath = filepath

  if (targetFilepath) {
    const ext = path.extname(targetFilepath)
    if (!ext) {
      targetFilepath += binExt
    } else if (!ext.includes(binExt)) {
      throw new Error(`Error: \`${targetFilepath}\`. Only \`${binExt}\` extension allowed.`)
    }
  }

  ensureDir(targetOutdir)
  const filedir = path.dirname(targetFilepath)
  if (filedir && filedir !== '.') ensureDir(path.join(targetOutdir, filedir))

  if (path.isAbsolute(targetFilepath)) {
    if (targetOutdir !== process.cwd()) {
      console.log(
        `\nWarning: \`${targetFilepath}\` \n\t==> absolute path given so outdir is ignored for this file.`
      )
    }
    targetOutdir = ''
  }

  targetFilepath = path.join(targetOutdir, targetFilepath)
  return { outdir: targetOutdir, filepath: targetFilepath }
}

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n') {
      row.push(field.replace(/\r$/, ''))
      rows.push(row)
      row = []
      field = ''
    } else {
      field += ch
    }
  }

  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ''))
    rows.push(row)
  }

  const filtered = rows.filter((r) => r.length && !String(r[0]).startsWith('#'))
  if (!filtered.length) return []
  const headers = filtered[0].map((h) => h.trim())
  return filtered
    .slice(1)
    .filter((r) => r.some((v) => v !== ''))
    .map((r) => {
      const obj = {}
      headers.forEach((h, idx) => {
        obj[h] = r[idx] ?? ''
      })
      return obj
    })
}

function generateKey(args) {
  const pageMaxSize = 4096
  const keysDir = 'keys'
  const binExt = '.bin'
  let keyfile = args.keyfile

  if (!keyfile) {
    const now = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    const timestamp = `${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`
    keyfile = `keys-${timestamp}${binExt}`
  }

  const keysOutdir = path.join(args.outdir, keysDir)
  ensureDir(keysOutdir)
  const target = setTargetFilepath(keysOutdir, keyfile)
  const keyBytes = crypto.randomBytes(64)

  const keysBuf = Buffer.alloc(pageMaxSize, 0xff)
  keyBytes.copy(keysBuf, 0)
  keysBuf.writeUInt32LE(crc32(keyBytes, 0xffffffff), keyBytes.length)
  fs.writeFileSync(target.filepath, keysBuf)

  console.log('\nCreated encryption keys: ===> ', target.filepath)
  return keyBytes.toString('hex')
}

function generateFromCsv({ csvText, size, version = 2, isEncrEnabled = false, encrKey = null }) {
  const inputSize = checkSize(size)
  const nvsVersion = version === 1 ? Page.VERSION1 : Page.VERSION2
  const rows = parseCsv(csvText)
  const nvsObj = nvsOpen(inputSize, nvsVersion, isEncrEnabled, encrKey)

  for (const row of rows) {
    const key = row.key ?? ''
    if (key.length > 15) {
      throw new InputError(`Length of key \`${key}\` should be <= 15 characters.`)
    }
    writeEntry(nvsObj, key, row.type, row.encoding, row.value)
  }

  return nvsObj.close()
}

function generate(args, isEncrEnabled = false, encrKey = null) {
  const ext = path.extname(args.output)
  if (!ext.includes('.bin'))
    throw new Error(`Error: \`${args.output}\`. Only \`.bin\` extension allowed.`)
  const target = setTargetFilepath(args.outdir, args.output)
  args.outdir = target.outdir
  args.output = target.filepath

  if (isEncrEnabled && !encrKey) encrKey = generateKey(args)

  const csvText = fs.readFileSync(args.input, 'utf8')
  const versionLabel = args.version === 1 ? VERSION1_PRINT : VERSION2_PRINT
  console.log('\nCreating NVS binary with version:', versionLabel)

  try {
    const bin = generateFromCsv({
      csvText,
      size: args.size,
      version: args.version,
      isEncrEnabled,
      encrKey
    })
    fs.writeFileSync(args.output, bin)
  } catch (err) {
    if (err instanceof InputError) {
      console.error('\nError:')
      console.error(err.message)
      if (path.basename(args.output) && fs.existsSync(args.output)) {
        console.log('\nWarning: NVS binary not created...')
        fs.unlinkSync(args.output)
      }
      process.exitCode = -2
      return
    }
    throw err
  }

  console.log('\nCreated NVS binary: ===>', args.output)
}

function encrypt(args) {
  checkSize(args.size)
  let key = null
  if (!args.keygen && !args.inputkey)
    throw new Error('Error. --keygen or --inputkey argument needed.')
  if (args.keygen && args.inputkey)
    throw new Error('Error. --keygen and --inputkey both are not allowed.')
  if (!args.keygen && args.keyfile)
    console.log('\nWarning:', '--inputkey argument is given. --keyfile argument will be ignored...')

  if (args.inputkey) {
    if (!path.extname(args.inputkey).includes('.bin')) {
      throw new Error(`Error: \`${args.inputkey}\`. Only \`.bin\` extension allowed.`)
    }
    key = fs.readFileSync(args.inputkey).subarray(0, 64)
  }

  generate(args, true, key)
}

function buildTweak(pageNum, entryNo, entrySize) {
  const pageMaxSize = 4096
  const firstEntryOffset = 64
  const initTweakVal = '0'
  const tweakLenNeeded = 32
  const relAddr = pageNum * pageMaxSize + firstEntryOffset
  const addr = (relAddr + entryNo * entrySize).toString(16)
  if (addr.length > 2) {
    const addrTmp = addr.length % 2 === 0 ? addr : initTweakVal + addr
    const tweakTmp = reverseHexBytes(addrTmp)
    return Buffer.from(tweakTmp + initTweakVal.repeat(tweakLenNeeded - tweakTmp.length), 'hex')
  }
  return Buffer.from(addr + initTweakVal.repeat(tweakLenNeeded - addr.length), 'hex')
}

function decryptData(dataInput, decrKey, pageNum, entryNo, entrySize) {
  const key = Buffer.isBuffer(decrKey) ? decrKey : Buffer.from(decrKey)
  const cipherName = key.length === 32 ? 'aes-128-xts' : 'aes-256-xts'
  const decipher = crypto.createDecipheriv(cipherName, key, buildTweak(pageNum, entryNo, entrySize))
  decipher.setAutoPadding(false)
  return Buffer.concat([decipher.update(dataInput), decipher.final()])
}

function decrypt(args) {
  for (const filepath of [args.input, args.key, args.output]) {
    if (!path.extname(filepath).includes('.bin')) {
      throw new Error(`Error: \`${filepath}\`. Only \`.bin\` extension allowed.`)
    }
  }

  const decrKey = fs.readFileSync(args.key).subarray(0, 64)
  const target = setTargetFilepath(args.outdir, args.output)
  const input = fs.readFileSync(args.input)
  const output = Buffer.from(input)
  const nvsReadBytes = 32
  const emptyDataEntry = Buffer.alloc(nvsReadBytes, 0xff)
  let decryptedEntryNo = 0
  let fileEntryNo = 0
  let pageNum = 0

  for (let offset = 0; offset < input.length; offset += nvsReadBytes) {
    if (fileEntryNo === 128) {
      decryptedEntryNo = 0
      fileEntryNo = 0
      pageNum += 1
    }

    const dataEntry = input.subarray(offset, offset + nvsReadBytes)
    if (!dataEntry.equals(emptyDataEntry) && ![0, 1].includes(fileEntryNo)) {
      const decrypted = decryptData(dataEntry, decrKey, pageNum, decryptedEntryNo, nvsReadBytes)
      decrypted.copy(output, offset)
      decryptedEntryNo += 1
    }
    fileEntryNo += 1
  }

  fs.writeFileSync(target.filepath, output)
  console.log('\nCreated NVS decrypted binary: ===>', target.filepath)
}

function parseArgs(argv) {
  const [command, ...rest] = argv
  const args = {
    command,
    outdir: process.cwd(),
    version: 2,
    keygen: false,
    keyfile: null,
    inputkey: null
  }

  function consumeOptions(values) {
    const positional = []
    for (let i = 0; i < values.length; i += 1) {
      const arg = values[i]
      if (arg === '--version') args.version = Number.parseInt(values[++i], 10)
      else if (arg === '--outdir') args.outdir = values[++i]
      else if (arg === '--keyfile') args.keyfile = values[++i]
      else if (arg === '--inputkey') args.inputkey = values[++i]
      else if (arg === '--keygen') args.keygen = true
      else positional.push(arg)
    }
    return positional
  }

  const positional = consumeOptions(rest)
  if (command === 'generate' || command === 'encrypt') {
    ;[args.input, args.output, args.size] = positional
  } else if (command === 'decrypt') {
    ;[args.input, args.key, args.output] = positional
  } else if (command === 'generate-key') {
    // no positional arguments
  } else {
    usage()
    process.exit(2)
  }
  return args
}

function usage() {
  console.log(`ESP NVS partition generation utility

Usage:
  node nvs_partition_gen.js generate <input.csv> <output.bin> <size> [--version 1|2] [--outdir <dir>]
  node nvs_partition_gen.js generate-key [--keyfile <file.bin>] [--outdir <dir>]
  node nvs_partition_gen.js encrypt <input.csv> <output.bin> <size> [--version 1|2] (--keygen | --inputkey <key.bin>) [--keyfile <file.bin>] [--outdir <dir>]
  node nvs_partition_gen.js decrypt <input.bin> <key.bin> <output.bin> [--outdir <dir>]`)
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  try {
    if (args.command === 'generate') generate(args)
    else if (args.command === 'generate-key') generateKey(args)
    else if (args.command === 'encrypt') encrypt(args)
    else if (args.command === 'decrypt') decrypt(args)
  } catch (err) {
    console.error(err.message || err)
    process.exit(1)
  }
}

if (require.main === module) main()

module.exports = {
  Page,
  NVS,
  nvsOpen,
  writeEntry,
  checkSize,
  parseCsv,
  generateFromCsv,
  generate,
  generateKey,
  encrypt,
  decrypt,
  crc32,
  InputError
}
