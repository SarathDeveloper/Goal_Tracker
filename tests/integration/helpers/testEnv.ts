import type { Express } from 'express'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, expect } from 'vitest'
import request from 'supertest'
import { createApp } from '../../../server/app'
import { closeDatabase, getDatabase, initDatabase } from '../../../server/db/index'

let directory = ''
let app: Express

export function useTestDatabase(): void {
  beforeEach(() => {
    closeDatabase()
    directory = mkdtempSync(join(tmpdir(), 'goal-tracker-'))
    process.env.GOALTRACKER_DATA_DIR = directory
    delete process.env.GOALTRACKER_TODAY
    delete process.env.GOALTRACKER_NOW_MINUTES
    initDatabase()
    app = createApp()
  })

  afterEach(() => {
    closeDatabase()
    rmSync(directory, { recursive: true, force: true })
    delete process.env.GOALTRACKER_DATA_DIR
    delete process.env.GOALTRACKER_TODAY
    delete process.env.GOALTRACKER_NOW_MINUTES
  })
}

export function testApp(): Express {
  return app
}

export function dataDir(): string {
  return directory
}

export async function createGoal(overrides: Record<string, unknown> = {}) {
  const response = await request(testApp())
    .post('/api/goals')
    .send({
      title: 'Ship the app',
      description: '',
      categoryId: null,
      priority: 'medium',
      status: 'not_started',
      startDate: null,
      targetDate: null,
      metricType: 'milestones',
      startValue: null,
      targetValue: null,
      unit: '',
      ...overrides,
    })
  expect(response.status).toBe(201)
  return response.body as { id: number; title: string; categoryId: number | null; status: string }
}

export function migrationVersions(): number[] {
  return getDatabase()
    .prepare('SELECT version FROM schema_migrations ORDER BY version')
    .all()
    .map((row) => (row as { version: number }).version)
}
