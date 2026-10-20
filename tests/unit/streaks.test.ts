import { describe, expect, it } from 'vitest'
import { dailyStreaks, weeklyStreaks } from '../../shared/streaks'

describe('streaks', () => {
  it('counts a daily streak through today, or through yesterday while today is still open', () => {
    expect(dailyStreaks([], '2026-10-20')).toEqual({ current: 0, longest: 0 })
    expect(dailyStreaks(['2026-10-20'], '2026-10-20')).toEqual({ current: 1, longest: 1 })
    expect(dailyStreaks(['2026-10-19'], '2026-10-20')).toEqual({ current: 1, longest: 1 })
    expect(dailyStreaks(['2026-10-18'], '2026-10-20')).toEqual({ current: 0, longest: 1 })
    expect(dailyStreaks(['2026-10-18', '2026-10-19', '2026-10-20'], '2026-10-20')).toEqual({ current: 3, longest: 3 })
  })

  it('breaks the longest daily run at a gap', () => {
    expect(dailyStreaks(['2026-10-01', '2026-10-02', '2026-10-04', '2026-10-05', '2026-10-06'], '2026-10-20')).toEqual({
      current: 0,
      longest: 3,
    })
  })

  it('counts weekly streaks from successful weeks and keeps an open week from breaking them', () => {
    const dates = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-12', '2026-10-13', '2026-10-14']
    expect(weeklyStreaks(dates, '2026-10-20', 3)).toEqual({ current: 2, longest: 2 })
    expect(weeklyStreaks(['2026-10-05', '2026-10-06', '2026-10-07'], '2026-10-13', 3)).toEqual({
      current: 1,
      longest: 1,
    })
    expect(weeklyStreaks(['2026-10-05'], '2026-10-20', 3)).toEqual({ current: 0, longest: 0 })
  })
})
