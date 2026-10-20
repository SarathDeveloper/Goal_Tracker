import type { MilestoneInput } from '@shared/schemas'
import type { Goal, Milestone } from '@shared/types'
import { getDatabase } from '../db'
import { nowIso } from '../lib/clock'
import { HttpError } from '../lib/http'
import { getGoal } from './goalService'

interface MilestoneRow {
  id: number
  goal_id: number
  title: string
  position: number
  due_date: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

function mapMilestone(row: MilestoneRow): Milestone {
  return {
    id: row.id,
    goalId: row.goal_id,
    title: row.title,
    position: row.position,
    dueDate: row.due_date,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function getMilestoneRow(id: number): MilestoneRow {
  const row = getDatabase()
    .prepare(
      `SELECT id, goal_id, title, position, due_date, completed_at, created_at, updated_at
       FROM milestones WHERE id = ?`,
    )
    .get(id) as MilestoneRow | undefined
  if (!row) {
    throw new HttpError(404, 'Milestone not found')
  }
  return row
}

export function createMilestone(goalId: number, input: MilestoneInput): { milestone: Milestone; goal: Goal } {
  getGoal(goalId)
  const db = getDatabase()
  const positionRow = db.prepare('SELECT COALESCE(MAX(position), -1) AS position FROM milestones WHERE goal_id = ?').get(goalId) as {
    position: number
  }
  const timestamp = nowIso()
  const result = db
    .prepare(
      `INSERT INTO milestones (goal_id, title, position, due_date, completed_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, NULL, ?, ?)`,
    )
    .run(goalId, input.title, positionRow.position + 1, input.dueDate, timestamp, timestamp)
  return {
    milestone: mapMilestone(getMilestoneRow(Number(result.lastInsertRowid))),
    goal: getGoal(goalId),
  }
}

export function updateMilestone(id: number, input: MilestoneInput): { milestone: Milestone; goal: Goal } {
  const existing = getMilestoneRow(id)
  getDatabase()
    .prepare('UPDATE milestones SET title = ?, due_date = ?, updated_at = ? WHERE id = ?')
    .run(input.title, input.dueDate, nowIso(), id)
  return { milestone: mapMilestone(getMilestoneRow(id)), goal: getGoal(existing.goal_id) }
}

export function toggleMilestone(id: number): { milestone: Milestone; goal: Goal } {
  const existing = getMilestoneRow(id)
  const completedAt = existing.completed_at ? null : nowIso()
  getDatabase()
    .prepare('UPDATE milestones SET completed_at = ?, updated_at = ? WHERE id = ?')
    .run(completedAt, nowIso(), id)
  return { milestone: mapMilestone(getMilestoneRow(id)), goal: getGoal(existing.goal_id) }
}

export function deleteMilestone(id: number): Goal {
  const existing = getMilestoneRow(id)
  getDatabase().prepare('DELETE FROM milestones WHERE id = ?').run(id)
  return getGoal(existing.goal_id)
}

export function reorderMilestones(goalId: number, ids: number[]): Goal {
  getGoal(goalId)
  const rows = getDatabase().prepare('SELECT id FROM milestones WHERE goal_id = ?').all(goalId) as Array<{ id: number }>
  const existing = new Set(rows.map((row) => row.id))
  const unique = new Set(ids)
  if (unique.size !== ids.length || unique.size !== existing.size || ids.some((id) => !existing.has(id))) {
    throw new HttpError(400, 'Reorder must include every milestone of this goal exactly once')
  }
  const timestamp = nowIso()
  const update = getDatabase().prepare('UPDATE milestones SET position = ?, updated_at = ? WHERE id = ?')
  getDatabase().transaction(() => {
    ids.forEach((id, index) => {
      update.run(index, timestamp, id)
    })
  })()
  return getGoal(goalId)
}
