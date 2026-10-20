import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getMigrationsDir } from '../lib/appPaths'

export interface Migration {
  version: number
  sql: string
}

const FILES: { version: number; file: string }[] = [
  { version: 1, file: '001_goals.sql' },
  { version: 2, file: '002_milestones.sql' },
  { version: 3, file: '003_progress.sql' },
  { version: 5, file: '005_habits.sql' },
  { version: 8, file: '008_reminders.sql' },
]

export function getMigrations(): Migration[] {
  const dir = getMigrationsDir()
  return FILES.map((migration) => ({
    version: migration.version,
    sql: readFileSync(join(dir, migration.file), 'utf8'),
  }))
}

export function latestMigrationVersion(): number {
  return FILES.reduce((max, migration) => Math.max(max, migration.version), 0)
}
