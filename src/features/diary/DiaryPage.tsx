import { addDays, isoWeekMonday, todayIso } from '@shared/dates'
import type { DiaryEntry } from '@shared/types'
import { useEffect, useState } from 'react'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { EmptyState } from '../../components/EmptyState'
import { useToast } from '../../components/toastContext'
import { api } from '../../lib/api'
import { formatDate } from '../../lib/format'
import { DiaryEntryModal } from './DiaryEntryModal'
import { moodLabel } from './moods'

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="7" cy="7" r="4.25" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10.4 10.4 13.5 13.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function dayHeading(date: string, today: string): string {
  const formatted = formatDate(date)
  if (date === today) {
    return `Today · ${formatted}`
  }
  if (date === addDays(today, -1)) {
    return `Yesterday · ${formatted}`
  }
  return formatted
}

function groupByDate(entries: DiaryEntry[]): Array<{ date: string; entries: DiaryEntry[] }> {
  const groups: Array<{ date: string; entries: DiaryEntry[] }> = []
  for (const entry of entries) {
    const last = groups[groups.length - 1]
    if (last && last.date === entry.entryDate) {
      last.entries.push(entry)
    } else {
      groups.push({ date: entry.entryDate, entries: [entry] })
    }
  }
  return groups
}

export function DiaryPage() {
  const push = useToast()
  const [entries, setEntries] = useState<DiaryEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [menuId, setMenuId] = useState<number | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<DiaryEntry | null>(null)
  const [pendingDelete, setPendingDelete] = useState<DiaryEntry | null>(null)
  const today = todayIso()

  function load() {
    api<{ entries: DiaryEntry[] }>('/api/diary')
      .then((result) => {
        setEntries(result.entries)
        setError(null)
      })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Could not load the diary'))
  }

  useEffect(() => {
    load()
  }, [])

  async function remove() {
    if (!pendingDelete) return
    try {
      await api(`/api/diary/${pendingDelete.id}`, { method: 'DELETE' })
      setPendingDelete(null)
      load()
    } catch (caught) {
      push({ tone: 'error', message: caught instanceof Error ? caught.message : 'Could not delete the entry' })
    }
  }

  const loaded = entries ?? []
  const weekStart = isoWeekMonday(today)
  const weekCount = loaded.filter((entry) => entry.entryDate >= weekStart && entry.entryDate <= addDays(weekStart, 6)).length
  const moodWindowStart = addDays(today, -6)
  const recentMoods = loaded
    .filter((entry) => entry.mood !== null && entry.entryDate >= moodWindowStart && entry.entryDate <= today)
    .map((entry) => entry.mood as number)
  const averageMood =
    recentMoods.length === 0 ? null : recentMoods.reduce((sum, mood) => sum + mood, 0) / recentMoods.length
  const needle = query.trim().toLowerCase()
  const visible = loaded.filter((entry) => {
    if (!needle) return true
    return entry.title.toLowerCase().includes(needle) || entry.body.toLowerCase().includes(needle)
  })
  const groups = groupByDate(visible)

  return (
    <section>
      <div className="habits-head">
        <div>
          <p className="eyebrow">Diary</p>
          <h1>My Diary</h1>
          <p className="lede">Write as many notes as the day needs</p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          + New entry
        </button>
      </div>

      <div className="habit-stats">
        <article className="habit-stat">
          <span>Total entries</span>
          <b>{entries ? loaded.length : '…'}</b>
        </article>
        <article className="habit-stat">
          <span>This week</span>
          <b>{entries ? weekCount : '…'}</b>
        </article>
        <article className="habit-stat">
          <span>Average mood, 7 days</span>
          <b>{entries ? (averageMood === null ? '—' : averageMood.toFixed(1)) : '…'}</b>
        </article>
      </div>

      <div className="habit-toolbar">
        <label className="habit-search">
          <SearchIcon />
          <input
            value={query}
            placeholder="Search entries..."
            aria-label="Search entries"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>

      {error ? <EmptyState title="Could not load the diary" hint={error} /> : null}
      {entries === null && !error ? <p className="muted">Loading diary…</p> : null}
      {entries && loaded.length === 0 ? (
        <EmptyState title="No entries yet" hint="A short note about today is enough to start." />
      ) : null}
      {entries && loaded.length > 0 && visible.length === 0 ? <p className="muted">No entries match.</p> : null}

      {groups.length > 0 ? (
        <div className="diary-days">
          {groups.map((group) => (
            <section key={group.date} className="diary-day">
              <h2>{dayHeading(group.date, today)}</h2>
              {group.entries.map((entry) => {
                const mood = entry.mood === null ? null : moodLabel(entry.mood)
                return (
                  <article key={entry.id} className="diary-card" aria-label={entry.title}>
                    <header>
                      <div>
                        <h3>{entry.title}</h3>
                        {mood ? (
                          <p className="diary-mood">
                            <span aria-hidden="true">{mood.emoji}</span> {mood.label}
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className="habit-more"
                        aria-label={`Actions for ${entry.title}`}
                        aria-expanded={menuId === entry.id}
                        onClick={() => setMenuId((current) => (current === entry.id ? null : entry.id))}
                      >
                        ···
                      </button>
                    </header>
                    {menuId === entry.id ? (
                      <div className="diary-menu">
                        <button
                          type="button"
                          onClick={() => {
                            setMenuId(null)
                            setEditing(entry)
                            setFormOpen(true)
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMenuId(null)
                            setPendingDelete(entry)
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    ) : null}
                    {entry.body ? <p className="diary-body">{entry.body}</p> : null}
                  </article>
                )
              })}
            </section>
          ))}
        </div>
      ) : null}

      <DiaryEntryModal
        open={formOpen}
        entry={editing}
        onClose={() => setFormOpen(false)}
        onSaved={load}
      />
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this entry?"
        body="This note is removed from the diary."
        confirmLabel="Delete entry"
        danger
        onConfirm={() => void remove()}
        onClose={() => setPendingDelete(null)}
      />
    </section>
  )
}
