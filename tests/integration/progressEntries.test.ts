import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { closeDatabase, initDatabase } from '../../server/db/index'
import { createGoal, testApp, useTestDatabase } from './helpers/testEnv'

describe('progress entries', () => {
  useTestDatabase()

  it('logs, edits, and deletes entries for a measurable goal', async () => {
    process.env.GOALTRACKER_TODAY = '2026-10-20'
    const goal = await createGoal({ title: 'Run', metricType: 'numeric', startValue: 0, targetValue: 100, unit: 'km' })
    const created = await request(testApp()).post(`/api/goals/${goal.id}/progress`).send({ entryDate: '2026-10-18', value: 25, note: 'park' })
    expect(created.status).toBe(201)
    expect(created.body.goal.progressPercent).toBe(25)
    const updated = await request(testApp())
      .put(`/api/progress/${created.body.entry.id}`)
      .send({ entryDate: '2026-10-19', value: 40, note: '' })
    expect(updated.body.goal.progressPercent).toBe(40)
    const removed = await request(testApp()).delete(`/api/progress/${created.body.entry.id}`)
    expect(removed.body.progressPercent).toBe(0)
  })

  it('rejects entries on milestone goals, future dates, and equal start and target', async () => {
    process.env.GOALTRACKER_TODAY = '2026-10-20'
    const milestones = await createGoal({ title: 'Checklist' })
    const rejected = await request(testApp()).post(`/api/goals/${milestones.id}/progress`).send({ entryDate: '2026-10-20', value: 1 })
    expect(rejected.status).toBe(400)
    const numeric = await createGoal({ title: 'Numbers', metricType: 'numeric', startValue: 0, targetValue: 10 })
    const future = await request(testApp()).post(`/api/goals/${numeric.id}/progress`).send({ entryDate: '2026-10-21', value: 1 })
    expect(future.status).toBe(400)
    const same = await request(testApp()).post('/api/goals').send({ title: 'Flat', metricType: 'numeric', startValue: 5, targetValue: 5 })
    expect(same.status).toBe(400)
  })

  it('keeps the latest value after the database is reopened', async () => {
    process.env.GOALTRACKER_TODAY = '2026-10-20'
    const goal = await createGoal({ title: 'Pages', metricType: 'numeric', startValue: 0, targetValue: 50, unit: 'pages' })
    await request(testApp()).post(`/api/goals/${goal.id}/progress`).send({ entryDate: '2026-10-01', value: 10 })
    await request(testApp()).post(`/api/goals/${goal.id}/progress`).send({ entryDate: '2026-10-15', value: 20 })
    closeDatabase()
    initDatabase()
    const loaded = await request(testApp()).get(`/api/goals/${goal.id}`)
    expect(loaded.body.progressPercent).toBe(40)
    expect(loaded.body.progressEntries).toHaveLength(2)
  })
})
