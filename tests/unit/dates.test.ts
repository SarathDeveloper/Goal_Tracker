import { describe, expect, it } from 'vitest'
import { addDays, addMonths, isIsoDate, isoWeekMonday, recentMonths } from '../../shared/dates'

describe('dates', () => {
  it('accepts real calendar dates and rejects impossible ones', () => {
    expect(isIsoDate('2024-02-29')).toBe(true)
    expect(isIsoDate('2025-02-29')).toBe(false)
    expect(isIsoDate('2026-02-31')).toBe(false)
    expect(isIsoDate('2026-13-01')).toBe(false)
    expect(isIsoDate('20-10-2026')).toBe(false)
  })

  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01')
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29')
  })

  it('finds the Monday of an ISO week', () => {
    expect(isoWeekMonday('2026-10-20')).toBe('2026-10-19')
    expect(isoWeekMonday('2026-10-25')).toBe('2026-10-19')
    expect(isoWeekMonday('2026-01-01')).toBe('2025-12-29')
  })

  it('lists the current month and the five before it', () => {
    expect(recentMonths('2026-03-15', 6)).toEqual(['2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03'])
    expect(addMonths('2026-01', -1)).toBe('2025-12')
  })
})
