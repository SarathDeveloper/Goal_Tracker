import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { testApp, useTestDatabase } from './helpers/testEnv'

describe('health', () => {
  useTestDatabase()

  it('reports the database path and today', async () => {
    const response = await request(testApp()).get('/api/health')
    expect(response.status).toBe(200)
    expect(response.body.ok).toBe(true)
    expect(response.body.dbPath).toMatch(/goaltracker\.db$/)
    expect(response.body.today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('returns JSON for an unknown API route', async () => {
    const response = await request(testApp()).get('/api/missing')
    expect(response.status).toBe(404)
    expect(response.body.error).toBe('Not found')
  })
})
