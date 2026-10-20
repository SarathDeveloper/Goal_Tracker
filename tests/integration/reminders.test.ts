import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createGoal, testApp, useTestDatabase } from './helpers/testEnv'

describe('reminders', () => {
  useTestDatabase()

  it('returns a due goal once per day and waits until the check time', async () => {
    process.env.GOALTRACKER_TODAY = '2026-10-20'
    process.env.GOALTRACKER_NOW_MINUTES = '480'
    await createGoal({ title: 'Soon', targetDate: '2026-10-22' })
    await createGoal({ title: 'Later', targetDate: '2026-11-01' })
    const waiting = await request(testApp()).get('/api/reminders/due')
    expect(waiting.body.reminders).toEqual([])

    process.env.GOALTRACKER_NOW_MINUTES = '600'
    const due = await request(testApp()).get('/api/reminders/due')
    expect(due.body.reminders.map((item: { title: string }) => item.title)).toEqual(['Soon'])
    const again = await request(testApp()).get('/api/reminders/due')
    expect(again.body.reminders).toEqual([])
  })

  it('includes overdue goals and unchecked habits, and stays quiet when disabled', async () => {
    process.env.GOALTRACKER_TODAY = '2026-10-20'
    process.env.GOALTRACKER_NOW_MINUTES = '600'
    await createGoal({ title: 'Late', targetDate: '2026-10-01', status: 'in_progress' })
    await createGoal({ title: 'Finished', targetDate: '2026-10-01', status: 'completed' })
    await request(testApp()).post('/api/habits').send({ title: 'Stretch', frequency: 'daily' })
    const due = await request(testApp()).get('/api/reminders/due')
    expect(due.body.reminders.map((item: { detail: string }) => item.detail)).toEqual([
      'Late was due on 2026-10-01',
      'Check in: Stretch',
    ])

    await request(testApp()).put('/api/reminders/settings').send({ enabled: false, daysBefore: 3, checkTime: '09:00' })
    process.env.GOALTRACKER_TODAY = '2026-10-21'
    const disabled = await request(testApp()).get('/api/reminders/due')
    expect(disabled.body.reminders).toEqual([])

    const invalid = await request(testApp()).put('/api/reminders/settings').send({ enabled: true, daysBefore: 90, checkTime: '9am' })
    expect(invalid.status).toBe(400)
  })
})
