import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { closeDatabase, initDatabase } from '../../server/db/index'
import { createGoal, testApp, useTestDatabase } from './helpers/testEnv'

describe('milestones', () => {
  useTestDatabase()

  it('adds, toggles, reorders, and deletes milestones, and updates progress', async () => {
    const goal = await createGoal({ title: 'Write a book' })
    const first = await request(testApp()).post(`/api/goals/${goal.id}/milestones`).send({ title: 'Outline', dueDate: '2026-11-01' })
    const second = await request(testApp()).post(`/api/goals/${goal.id}/milestones`).send({ title: 'Draft' })
    expect(first.status).toBe(201)
    expect(second.body.goal.progressPercent).toBe(0)

    const toggled = await request(testApp()).post(`/api/milestones/${first.body.milestone.id}/toggle`)
    expect(toggled.body.milestone.completedAt).toEqual(expect.any(String))
    expect(toggled.body.goal.progressPercent).toBe(50)

    const reordered = await request(testApp())
      .post(`/api/goals/${goal.id}/milestones/reorder`)
      .send({ ids: [second.body.milestone.id, first.body.milestone.id] })
    expect(reordered.status).toBe(200)
    const detail = await request(testApp()).get(`/api/goals/${goal.id}`)
    expect(detail.body.milestones.map((milestone: { title: string }) => milestone.title)).toEqual(['Draft', 'Outline'])

    const rejected = await request(testApp())
      .post(`/api/goals/${goal.id}/milestones/reorder`)
      .send({ ids: [first.body.milestone.id] })
    expect(rejected.status).toBe(400)

    await request(testApp()).delete(`/api/milestones/${second.body.milestone.id}`)
    const remaining = await request(testApp()).get(`/api/goals/${goal.id}`)
    expect(remaining.body.milestones).toHaveLength(1)
    expect(remaining.body.progressPercent).toBe(100)
  })

  it('deletes milestones with the goal and keeps a toggle after reopen', async () => {
    const goal = await createGoal({ title: 'Garden' })
    const created = await request(testApp()).post(`/api/goals/${goal.id}/milestones`).send({ title: 'Plant' })
    await request(testApp()).post(`/api/milestones/${created.body.milestone.id}/toggle`)
    closeDatabase()
    initDatabase()
    const reopened = await request(testApp()).get(`/api/goals/${goal.id}`)
    expect(reopened.body.milestones[0].completedAt).toEqual(expect.any(String))
    await request(testApp()).delete(`/api/goals/${goal.id}`)
    const rows = await request(testApp()).get('/api/goals')
    expect(rows.body.total).toBe(0)
  })

  it('returns 404 when the goal or milestone does not exist', async () => {
    expect((await request(testApp()).post('/api/goals/99999/milestones').send({ title: 'Missing' })).status).toBe(404)
    expect((await request(testApp()).post('/api/milestones/99999/toggle')).status).toBe(404)
  })
})
