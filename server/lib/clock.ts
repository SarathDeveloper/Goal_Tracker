import { isIsoDate, todayIso } from '@shared/dates'

export function getToday(): string {
  const override = process.env.GOALTRACKER_TODAY
  if (override) {
    if (!isIsoDate(override)) {
      throw new Error(`GOALTRACKER_TODAY must be a real YYYY-MM-DD date, got ${override}`)
    }
    return override
  }
  return todayIso()
}

export function getNowMinutes(): number {
  const override = process.env.GOALTRACKER_NOW_MINUTES
  if (override !== undefined && override !== '') {
    const parsed = Number(override)
    if (!Number.isInteger(parsed) || parsed < 0 || parsed >= 24 * 60) {
      throw new Error('GOALTRACKER_NOW_MINUTES must be an integer from 0 to 1439')
    }
    return parsed
  }
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

export function nowIso(): string {
  return new Date().toISOString()
}

/** Noon UTC on the app's current day, so month grouping follows GOALTRACKER_TODAY. */
export function completedTimestamp(): string {
  return `${getToday()}T12:00:00.000Z`
}
