import { existsSync } from 'node:fs'
import { join } from 'node:path'

export function getAppRoot(): string {
  return process.env.GOALTRACKER_APP_ROOT || process.cwd()
}

export function getMigrationsDir(): string {
  const override = process.env.GOALTRACKER_MIGRATIONS_DIR
  const candidates = [
    override,
    join(getAppRoot(), 'server', 'db', 'migrations'),
    join(getAppRoot(), 'migrations'),
  ]
  for (const dir of candidates) {
    if (dir && existsSync(join(dir, '001_goals.sql'))) {
      return dir
    }
  }
  return join(getAppRoot(), 'server', 'db', 'migrations')
}
