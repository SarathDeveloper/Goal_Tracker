import { addDays, isoWeekMonday } from './dates.ts'

export interface Streaks {
  current: number
  longest: number
}

function longestRun(sorted: readonly string[], stepDays: number): number {
  let longest = 0
  let run = 0
  let previous: string | null = null
  for (const item of sorted) {
    run = previous !== null && addDays(previous, stepDays) === item ? run + 1 : 1
    longest = Math.max(longest, run)
    previous = item
  }
  return longest
}

function currentRun(success: ReadonlySet<string>, start: string, stepDays: number): number {
  let cursor = start
  let count = 0
  while (success.has(cursor)) {
    count += 1
    cursor = addDays(cursor, -stepDays)
  }
  return count
}

export function dailyStreaks(dates: readonly string[], today: string): Streaks {
  const unique = [...new Set(dates)].sort()
  const success = new Set(unique)
  const start = success.has(today) ? today : addDays(today, -1)
  return {
    current: success.has(start) ? currentRun(success, start, 1) : 0,
    longest: longestRun(unique, 1),
  }
}

export function weeklyStreaks(dates: readonly string[], today: string, targetPerPeriod: number): Streaks {
  const counts = new Map<string, number>()
  for (const date of new Set(dates)) {
    const monday = isoWeekMonday(date)
    counts.set(monday, (counts.get(monday) ?? 0) + 1)
  }
  const successful = [...counts.entries()]
    .filter(([, count]) => count >= targetPerPeriod)
    .map(([monday]) => monday)
    .sort()
  const success = new Set(successful)
  const thisMonday = isoWeekMonday(today)
  const start = success.has(thisMonday) ? thisMonday : addDays(thisMonday, -7)
  return {
    current: success.has(start) ? currentRun(success, start, 7) : 0,
    longest: longestRun(successful, 7),
  }
}
