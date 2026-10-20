import type { CategoryInput } from '@shared/schemas'
import type { Category } from '@shared/types'
import { getDatabase } from '../db'
import { nowIso } from '../lib/clock'
import { HttpError, isUniqueConstraint } from '../lib/http'

interface CategoryRow {
  id: number
  name: string
  color: string
  created_at: string
  goal_count: number
}

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
    goalCount: row.goal_count,
  }
}

const SELECT = `
  SELECT c.id, c.name, c.color, c.created_at,
    (SELECT COUNT(*) FROM goals g WHERE g.category_id = c.id) AS goal_count
  FROM categories c
`

export function listCategories(): Category[] {
  const rows = getDatabase().prepare(`${SELECT} ORDER BY c.name COLLATE NOCASE`).all() as CategoryRow[]
  return rows.map(mapCategory)
}

export function createCategory(input: CategoryInput): Category {
  try {
    const result = getDatabase()
      .prepare('INSERT INTO categories (name, color, created_at) VALUES (?, ?, ?)')
      .run(input.name, input.color, nowIso())
    const row = getDatabase().prepare(`${SELECT} WHERE c.id = ?`).get(Number(result.lastInsertRowid)) as CategoryRow
    return mapCategory(row)
  } catch (error) {
    if (isUniqueConstraint(error)) {
      throw new HttpError(409, 'A category with that name already exists')
    }
    throw error
  }
}

export function updateCategory(id: number, input: CategoryInput): Category {
  const existing = getDatabase().prepare('SELECT id FROM categories WHERE id = ?').get(id)
  if (!existing) {
    throw new HttpError(404, 'Category not found')
  }
  try {
    getDatabase().prepare('UPDATE categories SET name = ?, color = ? WHERE id = ?').run(input.name, input.color, id)
  } catch (error) {
    if (isUniqueConstraint(error)) {
      throw new HttpError(409, 'A category with that name already exists')
    }
    throw error
  }
  return mapCategory(getDatabase().prepare(`${SELECT} WHERE c.id = ?`).get(id) as CategoryRow)
}

export function deleteCategory(id: number): void {
  const result = getDatabase().prepare('DELETE FROM categories WHERE id = ?').run(id)
  if (result.changes === 0) {
    throw new HttpError(404, 'Category not found')
  }
}
