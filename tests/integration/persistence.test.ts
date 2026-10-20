import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { closeDatabase, initDatabase } from '../../server/db/index'
import { createGoal, testApp, useTestDatabase } from './helpers/testEnv'

describe('persistence', () => {
  useTestDatabase()

  it('keeps a goal after the database connection is closed and opened again', async () => {
    const created = await createGoal({ title: 'Still here', description: 'after restart' })
    closeDatabase()
    initDatabase()
    const loaded = await request(testApp()).get(`/api/goals/${created.id}`)
    expect(loaded.status).toBe(200)
    expect(loaded.body.title).toBe('Still here')
    expect(loaded.body.description).toBe('after restart')
  })
})
