import { describe, expect, it } from 'vitest'
import { categoryInputSchema, fieldErrors, goalInputSchema, habitInputSchema } from '../../shared/schemas'

const base = {
  title: 'Run a half marathon',
  description: '',
  categoryId: null,
  priority: 'medium',
  status: 'not_started',
  startDate: null,
  targetDate: null,
  metricType: 'milestones',
  startValue: null,
  targetValue: null,
  unit: '',
}

describe('goalInputSchema', () => {
  it('trims a valid goal', () => {
    const parsed = goalInputSchema.parse({ ...base, title: '  Run  ' })
    expect(parsed.title).toBe('Run')
  })

  it('rejects a blank title and a title over 120 characters', () => {
    expect(fieldErrors(goalInputSchema.safeParse({ ...base, title: '   ' }).error!).title).toBe('Title is required')
    expect(goalInputSchema.safeParse({ ...base, title: 'a'.repeat(121) }).success).toBe(false)
    expect(goalInputSchema.safeParse({ ...base, title: 'a'.repeat(120) }).success).toBe(true)
  })

  it('rejects a description over 2000 characters', () => {
    expect(goalInputSchema.safeParse({ ...base, description: 'a'.repeat(2000) }).success).toBe(true)
    expect(goalInputSchema.safeParse({ ...base, description: 'a'.repeat(2001) }).success).toBe(false)
  })

  it('rejects impossible dates and a target before the start', () => {
    expect(fieldErrors(goalInputSchema.safeParse({ ...base, targetDate: '2025-02-29' }).error!).targetDate).toMatch(/real date/)
    expect(goalInputSchema.safeParse({ ...base, targetDate: '2024-02-29' }).success).toBe(true)
    expect(goalInputSchema.safeParse({ ...base, startDate: '2026-02-31' }).success).toBe(false)
    const range = goalInputSchema.safeParse({ ...base, startDate: '2026-05-02', targetDate: '2026-05-01' })
    expect(fieldErrors(range.error!).targetDate).toBe('Target date cannot be before the start date')
  })

  it('rejects an unknown priority', () => {
    expect(goalInputSchema.safeParse({ ...base, priority: 'urgent' }).success).toBe(false)
  })

  it('requires two different numbers for a measurable goal', () => {
    expect(goalInputSchema.safeParse({ ...base, metricType: 'numeric' }).success).toBe(false)
    expect(
      goalInputSchema.safeParse({ ...base, metricType: 'numeric', startValue: 10, targetValue: 10 }).success,
    ).toBe(false)
    expect(goalInputSchema.safeParse({ ...base, metricType: 'numeric', startValue: 0, targetValue: 100, unit: 'km' }).success).toBe(
      true,
    )
  })
})

describe('category and habit schemas', () => {
  it('normalizes a category color and rejects a duplicate-looking blank name', () => {
    expect(categoryInputSchema.parse({ name: ' Focus ', color: '#ABCDEF' }).color).toBe('#abcdef')
    expect(categoryInputSchema.safeParse({ name: '', color: '#112233' }).success).toBe(false)
    expect(categoryInputSchema.safeParse({ name: 'Focus', color: 'teal' }).success).toBe(false)
  })

  it('allows a weekly target and rejects a daily target above one', () => {
    expect(habitInputSchema.safeParse({ title: 'Stretch', frequency: 'daily', targetPerPeriod: 2 }).success).toBe(false)
    expect(habitInputSchema.parse({ title: 'Lift', frequency: 'weekly', targetPerPeriod: 3 }).targetPerPeriod).toBe(3)
  })
})
