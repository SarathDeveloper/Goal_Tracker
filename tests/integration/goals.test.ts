import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createGoal, testApp, useTestDatabase } from './helpers/testEnv'

describe('goals', () => {
  useTestDatabase()

  it('keeps the original wording of a measurable goal through an update', async () => {
    const created = await request(testApp())
      .post('/api/goals')
      .send({
        title: 'Six packs',
        metricType: 'numeric',
        startValue: 64,
        targetValue: 75,
        unit: 'kg',
        startLabel: 'starting from fatty and 64 kg',
        targetLabel: '75kg weight and muscular body',
      })
    expect(created.status).toBe(201)
    expect(created.body.startLabel).toBe('starting from fatty and 64 kg')
    expect(created.body.targetLabel).toBe('75kg weight and muscular body')
    expect(created.body.startValue).toBe(64)
    expect(created.body.unit).toBe('kg')

    const updated = await request(testApp())
      .put(`/api/goals/${created.body.id}`)
      .send({
        title: 'Six packs',
        metricType: 'numeric',
        startValue: 64,
        targetValue: 70,
        unit: 'kg',
        startLabel: 'starting from fatty and 64 kg',
        targetLabel: '70 kg',
      })
    expect(updated.status).toBe(200)
    expect(updated.body.targetValue).toBe(70)
    expect(updated.body.targetLabel).toBe('70 kg')

    const loaded = await request(testApp()).get(`/api/goals/${created.body.id}`)
    expect(loaded.body.startLabel).toBe('starting from fatty and 64 kg')
    expect(loaded.body.targetLabel).toBe('70 kg')
  })

  it('creates a goal and reads it back', async () => {
    const created = await createGoal({ title: 'Read a novel', description: 'One chapter a night', priority: 'high' })
    const loaded = await request(testApp()).get(`/api/goals/${created.id}`)
    expect(loaded.status).toBe(200)
    expect(loaded.body.title).toBe('Read a novel')
    expect(loaded.body.priority).toBe('high')
    expect(loaded.body.progressPercent).toBe(0)
    expect(loaded.body.milestones).toEqual([])
  })

  it('rejects invalid input, an unknown category, and a missing goal', async () => {
    expect((await request(testApp()).post('/api/goals').send({ title: '  ' })).status).toBe(400)
    expect((await request(testApp()).post('/api/goals').send({ title: 'Dates', targetDate: '2026-02-31' })).status).toBe(400)
    expect(
      (await request(testApp()).post('/api/goals').send({ title: 'Range', startDate: '2026-06-02', targetDate: '2026-06-01' }))
        .status,
    ).toBe(400)
    expect((await request(testApp()).post('/api/goals').send({ title: 'Bad category', categoryId: 99999 })).status).toBe(400)
    expect((await request(testApp()).get('/api/goals/99999')).status).toBe(404)
    expect((await request(testApp()).put('/api/goals/99999').send({ title: 'Missing' })).status).toBe(404)
    expect((await request(testApp()).delete('/api/goals/99999')).status).toBe(404)
    expect((await request(testApp()).get('/api/goals/nope')).status).toBe(400)
  })

  it('filters, searches with literal percent signs, and sorts by title', async () => {
    await createGoal({ title: '100% done', description: 'literal', priority: 'low', status: 'completed' })
    await createGoal({ title: 'Read', priority: 'high', status: 'in_progress' })
    const search = await request(testApp()).get('/api/goals').query({ q: '%' })
    expect(search.body.goals.map((goal: { title: string }) => goal.title)).toEqual(['100% done'])
    const status = await request(testApp()).get('/api/goals').query({ status: 'in_progress' })
    expect(status.body.goals).toHaveLength(1)
    const sorted = await request(testApp()).get('/api/goals').query({ sort: 'title' })
    expect(sorted.body.goals.map((goal: { title: string }) => goal.title)).toEqual(['100% done', 'Read'])
    expect((await request(testApp()).get('/api/goals').query({ status: 'paused' })).status).toBe(400)
  })

  it('archives a goal, then brings it back, and sets completed_at only while completed', async () => {
    const goal = await createGoal({ title: 'Archive me' })
    const archived = await request(testApp()).post(`/api/goals/${goal.id}/archive`)
    expect(archived.body.archivedAt).toEqual(expect.any(String))
    const active = await request(testApp()).get('/api/goals')
    expect(active.body.goals).toHaveLength(0)
    const onlyArchived = await request(testApp()).get('/api/goals').query({ archived: '1' })
    expect(onlyArchived.body.goals).toHaveLength(1)
    await request(testApp()).post(`/api/goals/${goal.id}/unarchive`)
    const completed = await request(testApp()).put(`/api/goals/${goal.id}`).send({ title: 'Archive me', status: 'completed' })
    expect(completed.body.completedAt).toMatch(/^2026|^\d{4}/)
    expect(completed.body.completedAt).toContain('T12:00:00.000Z')
    const reopened = await request(testApp()).put(`/api/goals/${goal.id}`).send({ title: 'Archive me', status: 'in_progress' })
    expect(reopened.body.completedAt).toBeNull()
    const removed = await request(testApp()).delete(`/api/goals/${goal.id}`)
    expect(removed.status).toBe(204)
  })
})
