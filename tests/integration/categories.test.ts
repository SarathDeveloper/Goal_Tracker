import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createGoal, testApp, useTestDatabase } from './helpers/testEnv'

describe('categories', () => {
  useTestDatabase()

  it('creates, renames, and rejects a duplicate name regardless of case', async () => {
    const created = await request(testApp()).post('/api/categories').send({ name: 'Focus', color: '#112233' })
    expect(created.status).toBe(201)
    expect(created.body.color).toBe('#112233')

    const duplicate = await request(testApp()).post('/api/categories').send({ name: 'focus', color: '#445566' })
    expect(duplicate.status).toBe(409)

    const renamed = await request(testApp()).put(`/api/categories/${created.body.id}`).send({ name: 'Deep work', color: '#ABCDEF' })
    expect(renamed.status).toBe(200)
    expect(renamed.body.name).toBe('Deep work')
    expect(renamed.body.color).toBe('#abcdef')
  })

  it('clears a goal category when the category is deleted', async () => {
    const categories = await request(testApp()).get('/api/categories')
    const health = categories.body.categories.find((category: { name: string }) => category.name === 'Health')
    const goal = await createGoal({ title: 'Sleep', categoryId: health.id })
    const removed = await request(testApp()).delete(`/api/categories/${health.id}`)
    expect(removed.status).toBe(204)
    const loaded = await request(testApp()).get(`/api/goals/${goal.id}`)
    expect(loaded.body.categoryId).toBeNull()
    expect(loaded.body.categoryName).toBeNull()
  })

  it('returns 404 for a missing category and 400 for a bad color', async () => {
    expect((await request(testApp()).delete('/api/categories/99999')).status).toBe(404)
    expect((await request(testApp()).post('/api/categories').send({ name: 'Nope', color: 'blue' })).status).toBe(400)
  })
})
