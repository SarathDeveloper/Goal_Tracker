import { isoWeekMonday } from '@shared/dates'
import type { HabitInput } from '@shared/schemas'
import { dailyStreaks, weeklyStreaks } from '@shared/streaks'
import type { Habit, HabitFrequency } from '@shared/types'
import { getDatabase } from '../db'
import { getToday, nowIso } from '../lib/clock'
import { HttpError, isUniqueConstraint } from '../lib/http'

interface HabitRow {
  id: number
  title: string
  frequency: HabitFrequency
  target_per_period: number
  goal_id: number | null
  goal_title: string | null
  remind: number
  archived_at: string | null
  created_at: string
  updated_at: string
}

function datesFor(habitId: number): string[] {
  const rows = getDatabase()
    .prepare('SELECT checkin_date FROM habit_checkins WHERE habit_id = ? ORDER BY checkin_date')
    .all(habitId) as Array<{ checkin_date: string }>
  return rows.map((row) => row.checkin_date)
}

function mapHabit(row: HabitRow, dates: string[]): Habit {
  const today = getToday()
  const streaks =
    row.frequency === 'daily' ? dailyStreaks(dates, today) : weeklyStreaks(dates, today, row.target_per_period)
  const monday = isoWeekMonday(today)
  const periodCount =
    row.frequency === 'daily'
      ? dates.filter((date) => date === today).length
      : dates.filter((date) => isoWeekMonday(date) === monday).length
  return {
    id: row.id,
    title: row.title,
    frequency: row.frequency,
    targetPerPeriod: row.target_per_period,
    goalId: row.goal_id,
    goalTitle: row.goal_title,
    remind: row.remind === 1,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    currentStreak: streaks.current,
    longestStreak: streaks.longest,
    todayChecked: dates.includes(today),
    periodCount,
    checkinDates: dates,
  }
}

const SELECT = `
  SELECT h.id, h.title, h.frequency, h.target_per_period, h.goal_id, h.remind, h.archived_at, h.created_at, h.updated_at,
    g.title AS goal_title
  FROM habits h
  LEFT JOIN goals g ON g.id = h.goal_id
`

function loadHabit(id: number): Habit {
  const row = getDatabase().prepare(`${SELECT} WHERE h.id = ?`).get(id) as HabitRow | undefined
  if (!row) {
    throw new HttpError(404, 'Habit not found')
  }
  return mapHabit(row, datesFor(id))
}

function requireGoal(goalId: number | null): void {
  if (goalId === null) {
    return
  }
  const row = getDatabase().prepare('SELECT id FROM goals WHERE id = ?').get(goalId)
  if (!row) {
    throw new HttpError(400, 'Unknown goal')
  }
}

export function listHabits(archived = false): Habit[] {
  const rows = getDatabase()
    .prepare(
      `${SELECT} WHERE ${archived ? 'h.archived_at IS NOT NULL' : 'h.archived_at IS NULL'}
       ORDER BY h.title COLLATE NOCASE, h.id`,
    )
    .all() as HabitRow[]
  if (rows.length === 0) {
    return []
  }
  const checkins = getDatabase()
    .prepare(
      `SELECT habit_id, checkin_date FROM habit_checkins WHERE habit_id IN (${rows.map(() => '?').join(', ')}) ORDER BY checkin_date`,
    )
    .all(...rows.map((row) => row.id)) as Array<{ habit_id: number; checkin_date: string }>
  const byHabit = new Map<number, string[]>()
  for (const checkin of checkins) {
    const list = byHabit.get(checkin.habit_id) ?? []
    list.push(checkin.checkin_date)
    byHabit.set(checkin.habit_id, list)
  }
  return rows.map((row) => mapHabit(row, byHabit.get(row.id) ?? []))
}

export function getHabit(id: number): Habit {
  return loadHabit(id)
}

export function createHabit(input: HabitInput): Habit {
  requireGoal(input.goalId)
  const timestamp = nowIso()
  const result = getDatabase()
    .prepare(
      `INSERT INTO habits (title, frequency, target_per_period, goal_id, remind, archived_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NULL, ?, ?)`,
    )
    .run(input.title, input.frequency, input.targetPerPeriod, input.goalId, input.remind ? 1 : 0, timestamp, timestamp)
  return loadHabit(Number(result.lastInsertRowid))
}

export function updateHabit(id: number, input: HabitInput): Habit {
  loadHabit(id)
  requireGoal(input.goalId)
  getDatabase()
    .prepare(
      `UPDATE habits SET title = ?, frequency = ?, target_per_period = ?, goal_id = ?, remind = ?, updated_at = ? WHERE id = ?`,
    )
    .run(input.title, input.frequency, input.targetPerPeriod, input.goalId, input.remind ? 1 : 0, nowIso(), id)
  return loadHabit(id)
}

export function setHabitArchived(id: number, archived: boolean): Habit {
  loadHabit(id)
  getDatabase()
    .prepare('UPDATE habits SET archived_at = ?, updated_at = ? WHERE id = ?')
    .run(archived ? nowIso() : null, nowIso(), id)
  return loadHabit(id)
}

export function deleteHabit(id: number): void {
  const result = getDatabase().prepare('DELETE FROM habits WHERE id = ?').run(id)
  if (result.changes === 0) {
    throw new HttpError(404, 'Habit not found')
  }
}

export function checkIn(habitId: number, date: string): Habit {
  const habit = loadHabit(habitId)
  if (habit.archivedAt) {
    throw new HttpError(400, 'Archived habits cannot be checked in')
  }
  if (date > getToday()) {
    throw new HttpError(400, 'Check-in date cannot be in the future')
  }
  try {
    getDatabase()
      .prepare('INSERT INTO habit_checkins (habit_id, checkin_date, created_at) VALUES (?, ?, ?)')
      .run(habitId, date, nowIso())
  } catch (error) {
    if (isUniqueConstraint(error)) {
      throw new HttpError(409, 'Already checked in for that day')
    }
    throw error
  }
  return loadHabit(habitId)
}

export function clearCheckIn(habitId: number, date: string): Habit {
  loadHabit(habitId)
  const result = getDatabase()
    .prepare('DELETE FROM habit_checkins WHERE habit_id = ? AND checkin_date = ?')
    .run(habitId, date)
  if (result.changes === 0) {
    throw new HttpError(404, 'Check-in not found')
  }
  return loadHabit(habitId)
}
