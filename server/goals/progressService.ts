import type { ProgressInput } from '@shared/schemas'
import type { Goal, ProgressEntry } from '@shared/types'
import { getDatabase } from '../db'
import { getToday, nowIso } from '../lib/clock'
import { HttpError } from '../lib/http'
import { getGoal } from './goalService'

interface ProgressRow {
  id: number
  goal_id: number
  entry_date: string
  value: number
  note: string
  created_at: string
  updated_at: string
}

function mapEntry(row: ProgressRow): ProgressEntry {
  return {
    id: row.id,
    goalId: row.goal_id,
    entryDate: row.entry_date,
    value: row.value,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function requireNumericGoal(goalId: number): Goal {
  const goal = getGoal(goalId)
  if (goal.metricType !== 'numeric') {
    throw new HttpError(400, 'Progress entries are only for measurable goals')
  }
  return goal
}

function requireDateNotFuture(date: string): void {
  if (date > getToday()) {
    throw new HttpError(400, 'Entry date cannot be in the future')
  }
}

function getRow(id: number): ProgressRow {
  const row = getDatabase()
    .prepare('SELECT id, goal_id, entry_date, value, note, created_at, updated_at FROM progress_entries WHERE id = ?')
    .get(id) as ProgressRow | undefined
  if (!row) {
    throw new HttpError(404, 'Progress entry not found')
  }
  return row
}

export function createProgressEntry(goalId: number, input: ProgressInput): { entry: ProgressEntry; goal: Goal } {
  requireNumericGoal(goalId)
  requireDateNotFuture(input.entryDate)
  const timestamp = nowIso()
  const result = getDatabase()
    .prepare(
      `INSERT INTO progress_entries (goal_id, entry_date, value, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(goalId, input.entryDate, input.value, input.note, timestamp, timestamp)
  return { entry: mapEntry(getRow(Number(result.lastInsertRowid))), goal: getGoal(goalId) }
}

export function updateProgressEntry(id: number, input: ProgressInput): { entry: ProgressEntry; goal: Goal } {
  const existing = getRow(id)
  requireNumericGoal(existing.goal_id)
  requireDateNotFuture(input.entryDate)
  getDatabase()
    .prepare('UPDATE progress_entries SET entry_date = ?, value = ?, note = ?, updated_at = ? WHERE id = ?')
    .run(input.entryDate, input.value, input.note, nowIso(), id)
  return { entry: mapEntry(getRow(id)), goal: getGoal(existing.goal_id) }
}

export function deleteProgressEntry(id: number): Goal {
  const existing = getRow(id)
  getDatabase().prepare('DELETE FROM progress_entries WHERE id = ?').run(id)
  return getGoal(existing.goal_id)
}
