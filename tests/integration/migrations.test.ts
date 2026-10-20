import { describe, expect, it } from 'vitest'
import { closeDatabase, initDatabase } from '../../server/db/index'
import { migrationVersions, useTestDatabase } from './helpers/testEnv'
import request from 'supertest'
import { testApp } from './helpers/testEnv'

describe('migrations', () => {
  useTestDatabase()

  it('applies every migration once and seeds the default categories', async () => {
    expect(migrationVersions()).toEqual([1, 2, 3, 5, 8])
    closeDatabase()
    initDatabase()
    expect(migrationVersions()).toEqual([1, 2, 3, 5, 8])
    const response = await request(testApp()).get('/api/categories')
    expect(response.status).toBe(200)
    expect(response.body.categories.map((category: { name: string }) => category.name)).toEqual([
      'Career',
      'Finance',
      'Health',
      'Learning',
      'Personal',
    ])
  })
})
