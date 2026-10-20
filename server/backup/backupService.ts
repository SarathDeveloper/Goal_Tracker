import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import Database from 'better-sqlite3'
import { closeDatabase, getDatabase, getDbPath, initDatabase } from '../db'
import { latestMigrationVersion } from '../db/migrations'
import { HttpError } from '../lib/http'
import { getBackupsDir } from '../lib/paths'
import { sqliteNativeOptions } from '../lib/sqliteNative'

export function backupStatus(): { dbPath: string; backupDir: string } {
  return { dbPath: getDbPath(), backupDir: getBackupsDir() }
}

export async function backupDatabaseTo(destinationPath: string): Promise<string> {
  const destination = resolve(destinationPath)
  if (destination === resolve(getDbPath())) {
    throw new HttpError(400, 'Choose a different file from the one the app is using')
  }
  mkdirSync(dirname(destination), { recursive: true })
  await getDatabase().backup(destination)
  return destination
}

export function inspectBackup(sourcePath: string): { version: number } {
  if (!existsSync(sourcePath)) {
    throw new HttpError(400, 'Backup file not found')
  }
  let source: Database.Database | null = null
  try {
    source = new Database(sourcePath, sqliteNativeOptions({ readonly: true, fileMustExist: true }))
    const integrity = source.prepare('PRAGMA integrity_check').get() as { integrity_check: string }
    if (integrity.integrity_check !== 'ok') {
      throw new HttpError(400, 'That file is not a valid database')
    }
    const table = source
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'")
      .get()
    if (!table) {
      throw new HttpError(400, 'That file is not a Goal Tracker backup')
    }
    const row = source.prepare('SELECT MAX(version) AS version FROM schema_migrations').get() as {
      version: number | null
    }
    const version = row.version ?? 0
    if (version > latestMigrationVersion()) {
      throw new HttpError(400, 'That backup was made by a newer version of Goal Tracker')
    }
    return { version }
  } catch (error) {
    if (error instanceof HttpError) {
      throw error
    }
    throw new HttpError(400, 'That file is not a valid database')
  } finally {
    source?.close()
  }
}

function replaceDatabaseFile(dbPath: string, sourcePath: string): void {
  rmSync(`${dbPath}-wal`, { force: true })
  rmSync(`${dbPath}-shm`, { force: true })
  copyFileSync(sourcePath, dbPath)
  rmSync(`${dbPath}-wal`, { force: true })
  rmSync(`${dbPath}-shm`, { force: true })
}

export async function restoreDatabaseFrom(sourcePath: string): Promise<void> {
  const source = resolve(sourcePath)
  inspectBackup(source)
  const dbPath = getDbPath()
  if (source === resolve(dbPath)) {
    throw new HttpError(400, 'Choose a different file from the one the app is using')
  }
  const snapshot = resolve(getBackupsDir(), `pre-restore-${Date.now()}.db`)
  await backupDatabaseTo(snapshot)
  closeDatabase()
  try {
    replaceDatabaseFile(dbPath, source)
    initDatabase()
  } catch (error) {
    try {
      replaceDatabaseFile(dbPath, snapshot)
      initDatabase()
    } catch (rollbackError) {
      console.error('Could not roll the database back after a failed restore', rollbackError)
    }
    if (error instanceof HttpError) {
      throw error
    }
    throw new HttpError(500, 'Restore failed and the previous database was put back')
  }
}
