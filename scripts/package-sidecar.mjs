import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const bundle = join(root, 'sidecar-dist', 'goaltracker-api.cjs')
const binariesDir = join(root, 'src-tauri', 'binaries')
const cacheDir = join(root, 'sidecar-dist', 'node-dist')

if (!existsSync(bundle)) {
  console.error('Sidecar bundle is missing. Run npm run sidecar:build first.')
  process.exit(1)
}
if (process.platform !== 'win32' || process.arch !== 'x64') {
  console.error('The Goal Tracker sidecar package step currently runs on 64-bit Windows.')
  process.exit(1)
}

mkdirSync(binariesDir, { recursive: true })
mkdirSync(cacheDir, { recursive: true })

const output = join(binariesDir, 'goaltracker-api-x86_64-pc-windows-msvc.exe')
const configPath = join(root, 'sidecar-dist', 'sea-config.json')
const blobPath = join(root, 'sidecar-dist', 'sea-prep.blob')

writeFileSync(
  configPath,
  JSON.stringify(
    {
      main: bundle,
      output: blobPath,
      disableExperimentalSEAWarning: true,
      useCodeCache: false,
    },
    null,
    2,
  ),
)

function runNode(args) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' })
  if (result.status !== 0) {
    throw new Error(`Command failed: node ${args.join(' ')}`)
  }
}

runNode(['--experimental-sea-config', configPath])
copyFileSync(process.execPath, output)

const postject = join(root, 'node_modules', 'postject', 'dist', 'cli.js')
runNode([
  postject,
  output,
  'NODE_SEA_BLOB',
  blobPath,
  '--sentinel-fuse',
  'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
  '--overwrite',
])

console.log(`Packaged sidecar → ${output}`)
