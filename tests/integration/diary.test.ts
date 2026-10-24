import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { closeDatabase, initDatabase } from '../../server/db/index'
import { testApp, useTestDatabase } from './helpers/testEnv'

describe('diary', () => {
  useTestDatabase()

  it('keeps several entries on one day, newest first, and reloads them', async () => {
    process.env.GOALTRACKER_TODAY = '2026-10-24'
    const older = await request(testApp()).post('/api/diary').send({ entryDate: '2026-10-23', title: 'Yesterday', mood: 3 })
    expect(older.status).toBe(201)
    const morning = await request(testApp())
      .post('/api/diary')
      .send({ entryDate: '2026-10-24', title: 'Morning', body: 'Quiet start', mood: 4 })
    const evening = await request(testApp()).post('/api/diary').send({ entryDate: '2026-10-24', title: 'Evening', mood: 5 })
    expect(evening.status).toBe(201)

    const listed = await request(testApp()).get('/api/diary')
    expect(listed.body.entries.map((entry: { title: string }) => entry.title)).toEqual(['Evening', 'Morning', 'Yesterday'])
    expect(listed.body.entries[1].body).toBe('Quiet start')
    expect(listed.body.entries[1].mood).toBe(4)

    const updated = await request(testApp())
      .put(`/api/diary/${morning.body.id}`)
      .send({ entryDate: '2026-10-24', title: 'Midday', body: 'Rewritten', mood: null })
    expect(updated.status).toBe(200)
    expect(updated.body.title).toBe('Midday')
    expect(updated.body.mood).toBeNull()

    const found = await request(testApp()).get('/api/diary').query({ q: 'quiet' })
    expect(found.body.entries).toHaveLength(0)
    const rewritten = await request(testApp()).get('/api/diary').query({ q: 'rewritten' })
    expect(rewritten.body.entries.map((entry: { title: string }) => entry.title)).toEqual(['Midday'])

    closeDatabase()
    initDatabase()
    const reloaded = await request(testApp()).get(`/api/diary/${evening.body.id}`)
    expect(reloaded.body.title).toBe('Evening')

    const exported = await request(testApp()).get('/api/backup/export.json')
    expect(JSON.stringify(exported.body.diaryEntries)).toContain('Evening')
  })

  it('rejects a future date, a blank title, and a mood outside 1 to 5, then deletes', async () => {
    process.env.GOALTRACKER_TODAY = '2026-10-24'
    const future = await request(testApp()).post('/api/diary').send({ entryDate: '2026-10-25', title: 'Tomorrow' })
    expect(future.status).toBe(400)
    const blank = await request(testApp()).post('/api/diary').send({ entryDate: '2026-10-24', title: '   ' })
    expect(blank.status).toBe(400)
    const badMood = await request(testApp()).post('/api/diary').send({ entryDate: '2026-10-24', title: 'Nope', mood: 6 })
    expect(badMood.status).toBe(400)

    const created = await request(testApp()).post('/api/diary').send({ entryDate: '2026-10-24', title: 'Keep' })
    expect(created.body.mood).toBeNull()
    expect(created.body.body).toBe('')
    const removed = await request(testApp()).delete(`/api/diary/${created.body.id}`)
    expect(removed.status).toBe(204)
    const missing = await request(testApp()).get(`/api/diary/${created.body.id}`)
    expect(missing.status).toBe(404)
    const missingUpdate = await request(testApp())
      .put(`/api/diary/${created.body.id}`)
      .send({ entryDate: '2026-10-24', title: 'Gone' })
    expect(missingUpdate.status).toBe(404)
  })
})
