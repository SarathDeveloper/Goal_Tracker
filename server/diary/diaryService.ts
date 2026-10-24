import type { DiaryEntryInput } from '@shared/schemas'
import type { DiaryEntry, DiaryMood } from '@shared/types'
import { getDatabase } from '../db'
import { getToday, nowIso } from '../lib/clock'
import { HttpError } from '../lib/http'
import { likePattern } from '../lib/like'

interface DiaryRow {
  id: number
  entry_date: string
  title: string
  body: string
  mood: number | null
  created_at: string
  updated_at: string
}

const SELECT = 'SELECT id, entry_date, title, body, mood, created_at, updated_at FROM diary_entries'

function mapEntry(row: DiaryRow): DiaryEntry {
  return {
    id: row.id,
    entryDate: row.entry_date,
    title: row.title,
    body: row.body,
    mood: row.mood as DiaryMood | null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function loadEntry(id: number): DiaryEntry {
  const row = getDatabase().prepare(`${SELECT} WHERE id = ?`).get(id) as DiaryRow | undefined
  if (!row) {
    throw new HttpError(404, 'Diary entry not found')
  }
  return mapEntry(row)
}

function requirePastOrToday(date: string): void {
  if (date > getToday()) {
    throw new HttpError(400, 'Entry date cannot be in the future')
  }
}

export function listDiaryEntries(search = ''): DiaryEntry[] {
  const needle = search.trim()
  if (!needle) {
    const rows = getDatabase().prepare(`${SELECT} ORDER BY entry_date DESC, id DESC`).all() as DiaryRow[]
    return rows.map(mapEntry)
  }
  const pattern = likePattern(needle)
  const rows = getDatabase()
    .prepare(
      `${SELECT} WHERE title LIKE ? ESCAPE '\\' OR body LIKE ? ESCAPE '\\' ORDER BY entry_date DESC, id DESC`,
    )
    .all(pattern, pattern) as DiaryRow[]
  return rows.map(mapEntry)
}

export function getDiaryEntry(id: number): DiaryEntry {
  return loadEntry(id)
}

export function createDiaryEntry(input: DiaryEntryInput): DiaryEntry {
  requirePastOrToday(input.entryDate)
  const timestamp = nowIso()
  const result = getDatabase()
    .prepare(
      `INSERT INTO diary_entries (entry_date, title, body, mood, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(input.entryDate, input.title, input.body, input.mood, timestamp, timestamp)
  return loadEntry(Number(result.lastInsertRowid))
}

export function updateDiaryEntry(id: number, input: DiaryEntryInput): DiaryEntry {
  loadEntry(id)
  requirePastOrToday(input.entryDate)
  getDatabase()
    .prepare('UPDATE diary_entries SET entry_date = ?, title = ?, body = ?, mood = ?, updated_at = ? WHERE id = ?')
    .run(input.entryDate, input.title, input.body, input.mood, nowIso(), id)
  return loadEntry(id)
}

export function deleteDiaryEntry(id: number): void {
  const result = getDatabase().prepare('DELETE FROM diary_entries WHERE id = ?').run(id)
  if (result.changes === 0) {
    throw new HttpError(404, 'Diary entry not found')
  }
}
