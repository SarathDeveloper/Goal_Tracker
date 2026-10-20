import { mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

export function getDataDir(): string {
  const override = process.env.GOALTRACKER_DATA_DIR
  const dir = override ? resolve(override) : resolve(process.cwd(), 'data')
  mkdirSync(dir, { recursive: true })
  return dir
}

export function getBackupsDir(): string {
  const dir = join(getDataDir(), 'backups')
  mkdirSync(dir, { recursive: true })
  return dir
}
