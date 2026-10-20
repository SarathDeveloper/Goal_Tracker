import { toCsv } from '@shared/csv'
import { getDatabase } from '../db'
import { latestMigrationVersion } from '../db/migrations'
import { nowIso } from '../lib/clock'

export function exportJson(): Record<string, unknown> {
  const db = getDatabase()
  return {
    exportedAt: nowIso(),
    schemaVersion: latestMigrationVersion(),
    categories: db.prepare('SELECT * FROM categories ORDER BY id').all(),
    goals: db.prepare('SELECT * FROM goals ORDER BY id').all(),
    milestones: db.prepare('SELECT * FROM milestones ORDER BY id').all(),
    progressEntries: db.prepare('SELECT * FROM progress_entries ORDER BY id').all(),
    habits: db.prepare('SELECT * FROM habits ORDER BY id').all(),
    habitCheckins: db.prepare('SELECT * FROM habit_checkins ORDER BY id').all(),
    reminderSettings: db.prepare('SELECT * FROM reminder_settings').all(),
  }
}

function cell(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  return String(value)
}

export function exportCsv(kind: 'goals' | 'progress' | 'habits'): string {
  const db = getDatabase()
  if (kind === 'goals') {
    const rows = db
      .prepare(
        `SELECT g.id, g.title, g.description, c.name AS category, g.priority, g.status,
                g.start_date, g.target_date, g.metric_type, g.start_value, g.target_value, g.unit,
                g.completed_at, g.archived_at
         FROM goals g LEFT JOIN categories c ON c.id = g.category_id ORDER BY g.id`,
      )
      .all() as Array<Record<string, unknown>>
    return toCsv(
      [
        'id',
        'title',
        'description',
        'category',
        'priority',
        'status',
        'start_date',
        'target_date',
        'metric_type',
        'start_value',
        'target_value',
        'unit',
        'completed_at',
        'archived_at',
      ],
      rows.map((row) => [
        cell(row.id),
        cell(row.title),
        cell(row.description),
        cell(row.category),
        cell(row.priority),
        cell(row.status),
        cell(row.start_date),
        cell(row.target_date),
        cell(row.metric_type),
        cell(row.start_value),
        cell(row.target_value),
        cell(row.unit),
        cell(row.completed_at),
        cell(row.archived_at),
      ]),
    )
  }
  if (kind === 'progress') {
    const rows = db
      .prepare(
        `SELECT p.id, g.title AS goal, p.entry_date, p.value, p.note
         FROM progress_entries p JOIN goals g ON g.id = p.goal_id ORDER BY p.id`,
      )
      .all() as Array<Record<string, unknown>>
    return toCsv(
      ['id', 'goal', 'entry_date', 'value', 'note'],
      rows.map((row) => [cell(row.id), cell(row.goal), cell(row.entry_date), cell(row.value), cell(row.note)]),
    )
  }
  const habits = db
    .prepare(
      `SELECT h.id, h.title, h.frequency, h.target_per_period, g.title AS goal, h.archived_at
       FROM habits h LEFT JOIN goals g ON g.id = h.goal_id ORDER BY h.id`,
    )
    .all() as Array<Record<string, unknown>>
  const checkins = db
    .prepare('SELECT habit_id, checkin_date FROM habit_checkins ORDER BY checkin_date')
    .all() as Array<{ habit_id: number; checkin_date: string }>
  const byHabit = new Map<number, string[]>()
  for (const checkin of checkins) {
    const list = byHabit.get(checkin.habit_id) ?? []
    list.push(checkin.checkin_date)
    byHabit.set(checkin.habit_id, list)
  }
  return toCsv(
    ['id', 'title', 'frequency', 'target_per_period', 'goal', 'archived_at', 'checkins'],
    habits.map((row) => [
      cell(row.id),
      cell(row.title),
      cell(row.frequency),
      cell(row.target_per_period),
      cell(row.goal),
      cell(row.archived_at),
      (byHabit.get(Number(row.id)) ?? []).join('|'),
    ]),
  )
}
