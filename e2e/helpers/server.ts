import { type ChildProcess, spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const repoRoot = fileURLToPath(new URL('../..', import.meta.url))

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        reject(new Error('Could not reserve a port'))
        return
      }
      server.close(() => resolve(address.port))
    })
    server.on('error', reject)
  })
}

async function waitForHealth(port: number, child: ChildProcess): Promise<void> {
  const deadline = Date.now() + 20_000
  let output = ''
  child.stdout?.on('data', (chunk: Buffer) => {
    output += chunk.toString()
  })
  child.stderr?.on('data', (chunk: Buffer) => {
    output += chunk.toString()
  })
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Server exited before it was ready.\n${output}`)
    }
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`)
      if (response.ok) {
        return
      }
    } catch {
      // The process is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error(`Server did not open /api/health.\n${output}`)
}

function stopProcess(child: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (child.exitCode !== null || !child.pid) {
      resolve()
      return
    }
    const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true })
    killer.on('exit', () => resolve())
    killer.on('error', () => {
      child.kill()
      resolve()
    })
  })
}

export async function startAppServer(dataDir = mkdtempSync(join(tmpdir(), 'goal-tracker-e2e-'))): Promise<{
  port: number
  dataDir: string
  stop: () => Promise<void>
}> {
  const port = await freePort()
  const tsx = join(repoRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs')
  const child = spawn(process.execPath, [tsx, '--tsconfig', 'tsconfig.server.json', 'server/index.ts'], {
    cwd: repoRoot,
    env: { ...process.env, PORT: String(port), GOALTRACKER_DATA_DIR: dataDir },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })
  try {
    await waitForHealth(port, child)
  } catch (error) {
    await stopProcess(child)
    throw error
  }
  return { port, dataDir, stop: () => stopProcess(child) }
}
