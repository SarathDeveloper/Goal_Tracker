import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { closeDatabase, initDatabase } from '../../server/db/index'
import { createGoal, testApp, useTestDatabase } from './helpers/testEnv'

describe('habits', () => {
  useTestDatabase()

  it('checks in a daily habit, rejects a duplicate, and keeps the streak after reopen', async () => {
    process.env.GOALTRACKER_TODAY = '2026-10-20'
    const created = await request(testApp()).post('/api/habits').send({ title: 'Stretch', frequency: 'daily' })
    expect(created.status).toBe(201)
    expect(created.body.currentStreak).toBe(0)
    const checked = await request(testApp()).post(`/api/habits/${created.body.id}/checkins`).send({ date: '2026-10-20' })
    expect(checked.body.todayChecked).toBe(true)
    expect(checked.body.currentStreak).toBe(1)
    const duplicate = await request(testApp()).post(`/api/habits/${created.body.id}/checkins`).send({ date: '2026-10-20' })
    expect(duplicate.status).toBe(409)
    const future = await request(testApp()).post(`/api/habits/${created.body.id}/checkins`).send({ date: '2026-10-21' })
    expect(future.status).toBe(400)
    closeDatabase()
    initDatabase()
    const loaded = await request(testApp()).get(`/api/habits/${created.body.id}`)
    expect(loaded.body.checkinDates).toEqual(['2026-10-20'])
    const cleared = await request(testApp()).delete(`/api/habits/${created.body.id}/checkins/2026-10-20`)
    expect(cleared.body.todayChecked).toBe(false)
  })

  it('counts a weekly target and rejects a daily target above one', async () => {
    process.env.GOALTRACKER_TODAY = '2026-10-20'
    const goal = await createGoal({ title: 'Strength' })
    const habit = await request(testApp())
      .post('/api/habits')
      .send({ title: 'Lift', frequency: 'weekly', targetPerPeriod: 3, goalId: goal.id })
    expect(habit.body.goalTitle).toBe('Strength')
    await request(testApp()).post(`/api/habits/${habit.body.id}/checkins`).send({ date: '2026-10-19' })
    await request(testApp()).post(`/api/habits/${habit.body.id}/checkins`).send({ date: '2026-10-20' })
    const loaded = await request(testApp()).get(`/api/habits/${habit.body.id}`)
    expect(loaded.body.periodCount).toBe(2)
    expect(loaded.body.currentStreak).toBe(0)
    const invalid = await request(testApp()).post('/api/habits').send({ title: 'Twice', frequency: 'daily', targetPerPeriod: 2 })
    expect(invalid.status).toBe(400)
    const missingGoal = await request(testApp()).post('/api/habits').send({ title: 'Orphan', frequency: 'daily', goalId: 99999 })
    expect(missingGoal.status).toBe(400)
  })

  it('archives a habit and hides it from the active list', async () => {
    const habit = await request(testApp()).post('/api/habits').send({ title: 'Read', frequency: 'daily' })
    await request(testApp()).post(`/api/habits/${habit.body.id}/archive`)
    const active = await request(testApp()).get('/api/habits')
    expect(active.body.habits).toHaveLength(0)
    const archived = await request(testApp()).get('/api/habits').query({ archived: '1' })
    expect(archived.body.habits[0].title).toBe('Read')
    const removed = await request(testApp()).delete(`/api/habits/${habit.body.id}`)
    expect(removed.status).toBe(204)
  })
})
