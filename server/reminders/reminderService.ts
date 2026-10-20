import { addDays, isoWeekMonday } from '@shared/dates'
import type { ReminderSettingsInput } from '@shared/schemas'
import type { DueReminder, ReminderSettings } from '@shared/types'
import { getDatabase } from '../db'
import { getNowMinutes, getToday, nowIso } from '../lib/clock'

interface SettingsRow {
  enabled: number
  days_before: number
  check_time: string
}

function mapSettings(row: SettingsRow): ReminderSettings {
  return {
    enabled: row.enabled === 1,
    daysBefore: row.days_before,
    checkTime: row.check_time,
  }
}

export function getReminderSettings(): ReminderSettings {
  const row = getDatabase()
    .prepare('SELECT enabled, days_before, check_time FROM reminder_settings WHERE id = 1')
    .get() as SettingsRow
  return mapSettings(row)
}

export function updateReminderSettings(input: ReminderSettingsInput): ReminderSettings {
  getDatabase()
    .prepare('UPDATE reminder_settings SET enabled = ?, days_before = ?, check_time = ? WHERE id = 1')
    .run(input.enabled ? 1 : 0, input.daysBefore, input.checkTime)
  return getReminderSettings()
}

export function dueReminders(): DueReminder[] {
  const settings = getReminderSettings()
  if (!settings.enabled) {
    return []
  }
  const [hour, minute] = settings.checkTime.split(':').map(Number)
  if (getNowMinutes() < hour * 60 + minute) {
    return []
  }
  const today = getToday()
  const horizon = addDays(today, settings.daysBefore)
  const db = getDatabase()
  const goals = db
    .prepare(
      `SELECT id, title, target_date FROM goals
       WHERE archived_at IS NULL AND status != 'completed' AND target_date IS NOT NULL AND target_date <= ?
       ORDER BY target_date, id`,
    )
    .all(horizon) as Array<{ id: number; title: string; target_date: string }>
  const habits = db
    .prepare(
      `SELECT id, title, frequency, target_per_period FROM habits WHERE archived_at IS NULL ORDER BY title COLLATE NOCASE, id`,
    )
    .all() as Array<{ id: number; title: string; frequency: 'daily' | 'weekly'; target_per_period: number }>
  const checkins = db
    .prepare('SELECT habit_id, checkin_date FROM habit_checkins')
    .all() as Array<{ habit_id: number; checkin_date: string }>
  const byHabit = new Map<number, string[]>()
  for (const checkin of checkins) {
    const list = byHabit.get(checkin.habit_id) ?? []
    list.push(checkin.checkin_date)
    byHabit.set(checkin.habit_id, list)
  }
  const monday = isoWeekMonday(today)
  const dueHabits = habits.filter((habit) => {
    const dates = byHabit.get(habit.id) ?? []
    if (habit.frequency === 'daily') {
      return !dates.includes(today)
    }
    const count = dates.filter((date) => isoWeekMonday(date) === monday).length
    return count < habit.target_per_period
  })

  const results: DueReminder[] = []
  const insert = db.prepare(
    'INSERT OR IGNORE INTO reminder_log (kind, subject_id, period_key, shown_at) VALUES (?, ?, ?, ?)',
  )
  const shownAt = nowIso()
  db.transaction(() => {
    for (const goal of goals) {
      const info = insert.run('goal', goal.id, today, shownAt)
      if (info.changes === 1) {
        results.push({
          kind: 'goal',
          id: goal.id,
          title: goal.title,
          detail:
            goal.target_date < today
              ? `${goal.title} was due on ${goal.target_date}`
              : `${goal.title} is due on ${goal.target_date}`,
        })
      }
    }
    for (const habit of dueHabits) {
      const info = insert.run('habit', habit.id, today, shownAt)
      if (info.changes === 1) {
        results.push({
          kind: 'habit',
          id: habit.id,
          title: habit.title,
          detail: `Check in: ${habit.title}`,
        })
      }
    }
  })()
  return results
}
