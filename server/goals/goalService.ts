import type { GoalInput } from '@shared/schemas'
import type { Goal, GoalDetail, GoalStatus, MetricType, Priority } from '@shared/types'
import { milestoneProgress, numericProgress } from '@shared/progress'
import { completedTimestamp, getToday, nowIso } from '../lib/clock'
import { getDatabase } from '../db'
import { HttpError } from '../lib/http'
import { likePattern } from '../lib/like'

export interface GoalFilters {
  q?: string
  status?: GoalStatus
  categoryId?: number
  priority?: Priority
  archived?: boolean
  sort?: 'updated' | 'title' | 'target' | 'priority'
}

interface GoalRow {
  id: number
  title: string
  description: string
  category_id: number | null
  category_name: string | null
  category_color: string | null
  priority: Priority
  status: GoalStatus
  start_date: string | null
  target_date: string | null
  completed_at: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
  metric_type: MetricType
  start_value: number | null
  target_value: number | null
  unit: string
  start_label: string
  target_label: string
  remind: number
  milestone_total: number
  milestone_done: number
  latest_value: number | null
}

const GOAL_SELECT = `
  SELECT
    g.id, g.title, g.description, g.category_id, g.priority, g.status,
    g.start_date, g.target_date, g.completed_at, g.archived_at,
    g.created_at, g.updated_at, g.metric_type, g.start_value, g.target_value, g.unit,
    g.start_label, g.target_label, g.remind,
    c.name AS category_name, c.color AS category_color,
    (SELECT COUNT(*) FROM milestones m WHERE m.goal_id = g.id) AS milestone_total,
    (SELECT COUNT(*) FROM milestones m WHERE m.goal_id = g.id AND m.completed_at IS NOT NULL) AS milestone_done,
    (
      SELECT p.value FROM progress_entries p
      WHERE p.goal_id = g.id
      ORDER BY p.entry_date DESC, p.id DESC
      LIMIT 1
    ) AS latest_value
  FROM goals g
  LEFT JOIN categories c ON c.id = g.category_id
`

const SORTS: Record<NonNullable<GoalFilters['sort']>, string> = {
  updated: 'g.updated_at DESC, g.id DESC',
  title: 'g.title COLLATE NOCASE ASC, g.id ASC',
  target: 'g.target_date IS NULL, g.target_date ASC, g.id ASC',
  priority: "CASE g.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, g.title COLLATE NOCASE ASC, g.id ASC",
}

function mapGoal(row: GoalRow): Goal {
  const progressPercent =
    row.metric_type === 'numeric'
      ? numericProgress(row.start_value ?? 0, row.target_value ?? 0, row.latest_value)
      : milestoneProgress(row.milestone_done, row.milestone_total)
  const overdue =
    row.archived_at === null &&
    row.status !== 'completed' &&
    row.target_date !== null &&
    row.target_date < getToday()
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    categoryId: row.category_id,
    categoryName: row.category_name,
    categoryColor: row.category_color,
    priority: row.priority,
    status: row.status,
    startDate: row.start_date,
    targetDate: row.target_date,
    completedAt: row.completed_at,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    metricType: row.metric_type,
    startValue: row.start_value,
    targetValue: row.target_value,
    unit: row.unit,
    startLabel: row.start_label,
    targetLabel: row.target_label,
    remind: row.remind === 1,
    progressPercent,
    milestoneCount: row.milestone_total,
    milestoneDone: row.milestone_done,
    overdue,
  }
}

function requireCategory(categoryId: number | null): void {
  if (categoryId === null) {
    return
  }
  const row = getDatabase().prepare('SELECT id FROM categories WHERE id = ?').get(categoryId)
  if (!row) {
    throw new HttpError(400, 'Unknown category')
  }
}

export function listGoals(filters: GoalFilters = {}): { goals: Goal[]; total: number } {
  const where: string[] = []
  const params: unknown[] = []
  where.push(filters.archived ? 'g.archived_at IS NOT NULL' : 'g.archived_at IS NULL')
  if (filters.status) {
    where.push('g.status = ?')
    params.push(filters.status)
  }
  if (filters.priority) {
    where.push('g.priority = ?')
    params.push(filters.priority)
  }
  if (filters.categoryId !== undefined) {
    where.push('g.category_id = ?')
    params.push(filters.categoryId)
  }
  if (filters.q) {
    where.push("(g.title LIKE ? ESCAPE '\\' OR g.description LIKE ? ESCAPE '\\')")
    const pattern = likePattern(filters.q)
    params.push(pattern, pattern)
  }
  const order = SORTS[filters.sort ?? 'updated']
  const rows = getDatabase()
    .prepare(`${GOAL_SELECT} WHERE ${where.join(' AND ')} ORDER BY ${order}`)
    .all(...params) as GoalRow[]
  const goals = rows.map(mapGoal)
  return { goals, total: goals.length }
}

export function getGoal(id: number): Goal {
  const row = getDatabase().prepare(`${GOAL_SELECT} WHERE g.id = ?`).get(id) as GoalRow | undefined
  if (!row) {
    throw new HttpError(404, 'Goal not found')
  }
  return mapGoal(row)
}

export function getGoalDetail(id: number): GoalDetail {
  const goal = getGoal(id)
  const milestones = getDatabase()
    .prepare(
      `SELECT id, goal_id, title, position, due_date, completed_at, created_at, updated_at
       FROM milestones WHERE goal_id = ? ORDER BY position ASC, id ASC`,
    )
    .all(id) as Array<{
    id: number
    goal_id: number
    title: string
    position: number
    due_date: string | null
    completed_at: string | null
    created_at: string
    updated_at: string
  }>
  const progressEntries = getDatabase()
    .prepare(
      `SELECT id, goal_id, entry_date, value, note, created_at, updated_at
       FROM progress_entries WHERE goal_id = ? ORDER BY entry_date DESC, id DESC`,
    )
    .all(id) as Array<{
    id: number
    goal_id: number
    entry_date: string
    value: number
    note: string
    created_at: string
    updated_at: string
  }>
  return {
    ...goal,
    milestones: milestones.map((row) => ({
      id: row.id,
      goalId: row.goal_id,
      title: row.title,
      position: row.position,
      dueDate: row.due_date,
      completedAt: row.completed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    progressEntries: progressEntries.map((row) => ({
      id: row.id,
      goalId: row.goal_id,
      entryDate: row.entry_date,
      value: row.value,
      note: row.note,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
  }
}

function completedAtFor(previous: GoalStatus, previousCompletedAt: string | null, next: GoalStatus): string | null {
  if (next === 'completed' && previous !== 'completed') {
    return completedTimestamp()
  }
  if (next !== 'completed' && previous === 'completed') {
    return null
  }
  return previousCompletedAt
}

export function createGoal(input: GoalInput): Goal {
  requireCategory(input.categoryId)
  const timestamp = nowIso()
  const completedAt = input.status === 'completed' ? completedTimestamp() : null
  const result = getDatabase()
    .prepare(
      `INSERT INTO goals (
        title, description, category_id, priority, status, start_date, target_date,
        completed_at, archived_at, created_at, updated_at, metric_type, start_value, target_value, unit,
        start_label, target_label, remind
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.title,
      input.description,
      input.categoryId,
      input.priority,
      input.status,
      input.startDate,
      input.targetDate,
      completedAt,
      timestamp,
      timestamp,
      input.metricType,
      input.startValue,
      input.targetValue,
      input.unit,
      input.startLabel,
      input.targetLabel,
      input.remind ? 1 : 0,
    )
  return getGoal(Number(result.lastInsertRowid))
}

export function updateGoal(id: number, input: GoalInput): Goal {
  const existing = getGoal(id)
  requireCategory(input.categoryId)
  const completedAt = completedAtFor(existing.status, existing.completedAt, input.status)
  getDatabase()
    .prepare(
      `UPDATE goals SET
        title = ?, description = ?, category_id = ?, priority = ?, status = ?,
        start_date = ?, target_date = ?, completed_at = ?, metric_type = ?,
        start_value = ?, target_value = ?, unit = ?, start_label = ?, target_label = ?, remind = ?, updated_at = ?
      WHERE id = ?`,
    )
    .run(
      input.title,
      input.description,
      input.categoryId,
      input.priority,
      input.status,
      input.startDate,
      input.targetDate,
      completedAt,
      input.metricType,
      input.startValue,
      input.targetValue,
      input.unit,
      input.startLabel,
      input.targetLabel,
      input.remind ? 1 : 0,
      nowIso(),
      id,
    )
  return getGoal(id)
}

export function setGoalArchived(id: number, archived: boolean): Goal {
  getGoal(id)
  getDatabase()
    .prepare('UPDATE goals SET archived_at = ?, updated_at = ? WHERE id = ?')
    .run(archived ? nowIso() : null, nowIso(), id)
  return getGoal(id)
}

export function deleteGoal(id: number): void {
  const result = getDatabase().prepare('DELETE FROM goals WHERE id = ?').run(id)
  if (result.changes === 0) {
    throw new HttpError(404, 'Goal not found')
  }
}
