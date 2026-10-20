import { writeFileSync, writeSync } from 'node:fs'
import { join } from 'node:path'
import { createApp } from './app'
import { initDatabase } from './db'
import { getDataDir } from './lib/paths'

function listenPort(): number {
  if (process.env.PORT) {
    const port = Number.parseInt(process.env.PORT, 10)
    if (!Number.isInteger(port) || port < 0) {
      throw new Error('PORT must be a whole number')
    }
    return port
  }
  return process.env.GOALTRACKER_SIDECAR === '1' ? 0 : 3000
}

const host = '127.0.0.1'

try {
  initDatabase()
} catch (error) {
  const detail = error instanceof Error ? (error.stack ?? error.message) : String(error)
  console.error(`Goal Tracker failed to start: database initialization error.\n${detail}`)
  process.exit(1)
}

const app = createApp()
const server = app.listen(listenPort(), host, () => {
  const address = server.address()
  const boundPort = typeof address === 'object' && address ? address.port : listenPort()
  writeFileSync(join(getDataDir(), 'api-port.txt'), String(boundPort))
  // A packaged sidecar writes to a pipe, where console.log can stay buffered
  // until the process exits. The desktop shell reads this line for the port.
  writeSync(1, `Goal Tracker API listening on http://${host}:${boundPort}\n`)
})

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Goal Tracker failed to start: port ${listenPort()} is already in use.`)
    process.exit(1)
  }
  throw error
})
