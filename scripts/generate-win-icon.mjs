import { existsSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import pngToIco from 'png-to-ico'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const iconPng = join(root, 'build/icon.png')
const iconIco = join(root, 'build/icon.ico')

if (!existsSync(iconPng)) {
  console.error(`Missing ${iconPng}. Run npm run icons:mac first.`)
  process.exit(1)
}

const buf = await pngToIco(iconPng)
writeFileSync(iconIco, buf)
console.log(`Windows icon: ${iconIco} (${buf.length} bytes)`)
