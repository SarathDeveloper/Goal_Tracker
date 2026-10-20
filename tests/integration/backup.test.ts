import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createGoal, dataDir, testApp, useTestDatabase } from './helpers/testEnv'

describe('backup and export', () => {
  useTestDatabase()

  it('restores a backup over later edits and rejects a corrupt or newer file', async () => {
    const goal = await createGoal({ title: 'Original' })
    const dir = mkdtempSync(join(tmpdir(), 'goal-backup-'))
    const destination = join(dir, 'backup.db')
    const exported = await request(testApp()).post('/api/backup/export').send({ destinationPath: destination })
    expect(exported.status).toBe(200)

    await request(testApp()).put(`/api/goals/${goal.id}`).send({ title: 'Changed' })
    const restored = await request(testApp()).post('/api/backup/restore').send({ sourcePath: destination })
    expect(restored.status).toBe(200)
    const loaded = await request(testApp()).get(`/api/goals/${goal.id}`)
    expect(loaded.body.title).toBe('Original')

    const junk = join(dir, 'notes.txt')
    writeFileSync(junk, 'not a database')
    const corrupt = await request(testApp()).post('/api/backup/restore').send({ sourcePath: junk })
    expect(corrupt.status).toBe(400)

    const Database = (await import('better-sqlite3')).default
    const { sqliteNativeOptions } = await import('../../server/lib/sqliteNative')
    const newerPath = join(dir, 'newer.db')
    const newer = new Database(newerPath, sqliteNativeOptions())
    newer.exec(`CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT);
      INSERT INTO schema_migrations (version, applied_at) VALUES (999, '2026-01-01');`)
    newer.close()
    const tooNew = await request(testApp()).post('/api/backup/restore').send({ sourcePath: newerPath })
    expect(tooNew.status).toBe(400)
    expect(tooNew.body.error).toMatch(/newer version/)
  })

  it('exports JSON and CSV that include the goal', async () => {
    await createGoal({ title: 'Export me', description: 'He said "hi"' })
    const json = await request(testApp()).get('/api/backup/export.json')
    expect(json.status).toBe(200)
    expect(JSON.stringify(json.body)).toContain('Export me')
    expect(json.body.schemaVersion).toBe(8)
    const csv = await request(testApp()).get('/api/backup/export.csv').query({ kind: 'goals' })
    expect(csv.status).toBe(200)
    expect(csv.headers['content-type']).toMatch(/text\/csv/)
    expect(csv.text).toContain('Export me')
    expect((await request(testApp()).get('/api/backup/export.csv').query({ kind: 'nope' })).status).toBe(400)
    const status = await request(testApp()).get('/api/backup/status')
    expect(status.body.dbPath).toContain(dataDir())
  })
})
