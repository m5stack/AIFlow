const { execSync } = require('child_process')
const { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } = require('fs')
const { join } = require('path')

const platform = process.argv[2]
const arch = process.argv[3]

if (!platform || !arch) {
  console.error('Usage: node scripts/prepare-claude-binary.js <platform> <arch>')
  console.error('Example: node scripts/prepare-claude-binary.js darwin x64')
  process.exit(1)
}

const rootDir = join(__dirname, '..')
const pkgName = `claude-agent-sdk-${platform}-${arch}`
const scopedPkg = `@anthropic-ai/${pkgName}`
const pkgDir = join(rootDir, 'node_modules', '@anthropic-ai', pkgName)
const binName = platform === 'win32' ? 'claude.exe' : 'claude'
const src = join(pkgDir, binName)
const stagingDir = join(rootDir, 'build', 'claude-staging')

function getSdkVersion() {
  const sdkPkgPath = join(rootDir, 'node_modules', '@anthropic-ai', 'claude-agent-sdk', 'package.json')
  const sdkPkg = JSON.parse(readFileSync(sdkPkgPath, 'utf8'))
  return sdkPkg.version
}

function packTarballName(version) {
  return `${scopedPkg.slice(1).replace('/', '-')}-${version}.tgz`
}

function downloadPlatformPackage(version) {
  const tgzPath = join(rootDir, packTarballName(version))
  console.log(`Claude binary missing for ${platform}-${arch}, downloading ${scopedPkg}@${version}...`)

  try {
    execSync(`npm pack ${scopedPkg}@${version}`, { cwd: rootDir, stdio: 'inherit' })
    rmSync(pkgDir, { recursive: true, force: true })
    mkdirSync(pkgDir, { recursive: true })
    execSync(`tar -xzf "${tgzPath}" -C "${pkgDir}" --strip-components=1`, { cwd: rootDir, stdio: 'inherit' })
  } finally {
    rmSync(tgzPath, { force: true })
  }
}

function ensurePlatformPackage() {
  if (existsSync(src)) return
  downloadPlatformPackage(getSdkVersion())

  if (!existsSync(src)) {
    console.error(`Claude binary still not found after download: ${src}`)
    process.exit(1)
  }
}

ensurePlatformPackage()

mkdirSync(stagingDir, { recursive: true })
copyFileSync(src, join(stagingDir, binName))
console.log(`Prepared ${binName} from ${scopedPkg}`)
