import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createGoal, testApp, useTestDatabase } from './helpers/testEnv'

describe('dashboard', () => {
  useTestDatabase()

  it('counts active, overdue, and due-soon goals against a fixed today', async () => {
    process.env.GOALTRACKER_TODAY = '2026-03-15'
    await createGoal({ title: 'Overdue', targetDate: '2026-03-10', status: 'in_progress' })
    await createGoal({ title: 'This week', targetDate: '2026-03-20' })
    await createGoal({ title: 'Later', targetDate: '2026-04-01' })
    await createGoal({ title: 'Done', targetDate: '2026-03-01', status: 'completed' })
    const archived = await createGoal({ title: 'Hidden', targetDate: '2026-03-01' })
    await request(testApp()).post(`/api/goals/${archived.id}/archive`)

    const response = await request(testApp()).get('/api/dashboard')
    expect(response.status).toBe(200)
    expect(response.body.today).toBe('2026-03-15')
    expect(response.body.counts).toMatchObject({ active: 3, completed: 1, overdue: 1, dueSoon: 1 })
    expect(response.body.overdue.map((goal: { title: string }) => goal.title)).toEqual(['Overdue'])
    expect(response.body.dueSoon.map((goal: { title: string }) => goal.title)).toEqual(['This week'])
    expect(response.body.completionsByMonth.find((month: { month: string }) => month.month === '2026-03').count).toBe(1)
    expect(response.body.completionsByMonth).toHaveLength(6)
  })
})
