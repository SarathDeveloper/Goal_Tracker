import { describe, expect, it } from 'vitest'
import { toCsv } from '../../shared/csv'

describe('csv', () => {
  it('quotes cells and doubles embedded quotes', () => {
    expect(toCsv(['name', 'note'], [['Run, daily', 'She said "go"']])).toBe('"name","note"\r\n"Run, daily","She said ""go"""\r\n')
  })
})
