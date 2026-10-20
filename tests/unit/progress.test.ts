import { describe, expect, it } from 'vitest'
import { milestoneProgress, numericProgress } from '../../shared/progress'

describe('progress', () => {
  it('treats a goal with no milestones as not started', () => {
    expect(milestoneProgress(0, 0)).toBe(0)
    expect(milestoneProgress(1, 2)).toBe(50)
    expect(milestoneProgress(2, 2)).toBe(100)
  })

  it('measures numeric goals in either direction and clamps the result', () => {
    expect(numericProgress(0, 100, null)).toBe(0)
    expect(numericProgress(0, 100, 40)).toBe(40)
    expect(numericProgress(100, 0, 40)).toBe(60)
    expect(numericProgress(0, 100, 140)).toBe(100)
    expect(numericProgress(0, 100, -10)).toBe(0)
    expect(numericProgress(5, 5, 5)).toBe(100)
    expect(numericProgress(5, 5, 4)).toBe(0)
  })
})
