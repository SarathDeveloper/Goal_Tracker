import { describe, expect, it } from 'vitest'
import { parseMeasurement } from '../../shared/measurement'

describe('parseMeasurement', () => {
  it('reads a number and the word after it', () => {
    expect(parseMeasurement('64 kg')).toEqual({ value: 64, unit: 'kg' })
    expect(parseMeasurement('64kg')).toEqual({ value: 64, unit: 'kg' })
    expect(parseMeasurement('5 km')).toEqual({ value: 5, unit: 'km' })
    expect(parseMeasurement('200 pages')).toEqual({ value: 200, unit: 'pages' })
    expect(parseMeasurement('30%')).toEqual({ value: 30, unit: '%' })
  })

  it('keeps the first number from a sentence', () => {
    expect(parseMeasurement('starting from fatty and 64 kg')).toEqual({ value: 64, unit: 'kg' })
    expect(parseMeasurement('75kg weight and muscular body')).toEqual({ value: 75, unit: 'kg' })
  })

  it('reads decimals, a leading minus, and thousands separators', () => {
    expect(parseMeasurement('12.5 km')).toEqual({ value: 12.5, unit: 'km' })
    expect(parseMeasurement('-3.5 C')).toEqual({ value: -3.5, unit: 'C' })
    expect(parseMeasurement('1,000 steps')).toEqual({ value: 1000, unit: 'steps' })
  })

  it('returns no value when the text has no number', () => {
    expect(parseMeasurement('fatty')).toEqual({ value: null, unit: '' })
    expect(parseMeasurement('   ')).toEqual({ value: null, unit: '' })
  })

  it('reads a bare number', () => {
    expect(parseMeasurement('66')).toEqual({ value: 66, unit: '' })
  })
})
