/**
 * Build macOS app icons: inset artwork to the 824×824 safe area (so Dock size
 * matches other apps), apply squircle mask, regenerate iconset/icns.
 *
 * Reads resources/icon.png (your artwork; never modified by this script).
 * Writes processed assets to build/icon.png, icon.iconset, icon.icns, icon.ico.
 */
import { execSync } from 'child_process'
import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import pngToIco from 'png-to-ico'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const buildDir = join(root, 'build')
/** User-provided master; script never writes here. */
const masterIcon = join(root, 'resources/icon.png')
const outputIcon = join(buildDir, 'icon.png')
const iconsetDir = join(buildDir, 'icon.iconset')
const masterSize = 1024
/** Apple-recommended artwork area inside a 1024 canvas (100px margin per side). */
const macSafeSize = 824
const safeInset = Math.floor((masterSize - macSafeSize) / 2)
const cornerRadius = Math.round(masterSize * 0.2237)

const iconsetSizes = [
  ['icon_16x16.png', 16],
  ['icon_16x16@2x.png', 32],
  ['icon_32x32.png', 32],
  ['icon_32x32@2x.png', 64],
  ['icon_128x128.png', 128],
  ['icon_128x128@2x.png', 256],
  ['icon_256x256.png', 256],
  ['icon_256x256@2x.png', 512],
  ['icon_512x512.png', 512],
  ['icon_512x512@2x.png', 1024]
]

function squircleMaskSvg(size, radius) {
  return Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="white"/>
    </svg>`
  )
}

/** Scale logo into the macOS safe zone and center on a transparent 1024 canvas. */
async function fitToMacSafeArea(input) {
  const artwork = await sharp(input)
    .resize(macSafeSize, macSafeSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toBuffer()

  return sharp({
    create: {
      width: masterSize,
      height: masterSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([{ input: artwork, left: safeInset, top: safeInset }])
    .png()
    .toBuffer()
}

async function applyMacCorners(paddedBuffer, output, size) {
  const radius = Math.round(size * 0.2237)
  const mask = squircleMaskSvg(size, radius)
  await sharp(paddedBuffer)
    .resize(size, size)
    .ensureAlpha()
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toFile(output)
}

async function writeIconsetFromMaster(masterPath) {
  mkdirSync(iconsetDir, { recursive: true })
  for (const [name, size] of iconsetSizes) {
    await sharp(masterPath).resize(size, size).png().toFile(join(iconsetDir, name))
  }
}

async function main() {
  if (!existsSync(masterIcon)) {
    console.error(
      `Missing ${masterIcon}\n` +
        'Add your logo there (script will not overwrite it), then run again.'
    )
    process.exit(1)
  }
  const inputPath = masterIcon
  const padded = await fitToMacSafeArea(inputPath)

  const roundedMaster = join(buildDir, '.icon-rounded-tmp.png')
  await applyMacCorners(padded, roundedMaster, masterSize)
  copyFileSync(roundedMaster, outputIcon)
  rmSync(roundedMaster, { force: true })

  await writeIconsetFromMaster(outputIcon)

  if (process.platform === 'darwin') {
    execSync(`xattr -cr "${iconsetDir}"`, { stdio: 'ignore' })
    execSync(`iconutil -c icns "${iconsetDir}" -o "${join(buildDir, 'icon.icns')}"`, {
      stdio: 'inherit'
    })
  } else {
    console.warn('Skipping icon.icns (iconutil is macOS-only). Run on macOS before packaging for Mac.')
  }

  const icoPath = join(buildDir, 'icon.ico')
  writeFileSync(icoPath, await pngToIco(outputIcon))

  console.log(
    `macOS icon: ${outputIcon} (${masterSize}px, artwork ${macSafeSize}px, inset ${safeInset}px, r≈${cornerRadius}px)`
  )
  console.log(`Windows icon: ${icoPath}`)
  console.log(`Input: ${inputPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
