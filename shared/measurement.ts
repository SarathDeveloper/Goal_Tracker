export interface Measurement {
  value: number | null
  unit: string
}

const NUMBER = /-?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?/
const UNIT = /^\s*([%\p{L}][\p{L}\p{M}]*)/u

export function parseMeasurement(raw: string): Measurement {
  const text = raw.trim()
  const match = NUMBER.exec(text)
  if (!match) {
    return { value: null, unit: '' }
  }
  const value = Number(match[0].replaceAll(',', ''))
  if (!Number.isFinite(value)) {
    return { value: null, unit: '' }
  }
  const after = text.slice((match.index ?? 0) + match[0].length)
  const unit = UNIT.exec(after)?.[1] ?? ''
  return { value, unit }
}

export function sameUnit(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase()
}
