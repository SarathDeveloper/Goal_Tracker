import { addDays, isoWeekMonday, todayIso } from '@shared/dates'
import type { Habit } from '@shared/types'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { EmptyState } from '../../components/EmptyState'
import { useToast } from '../../components/toastContext'
import { api } from '../../lib/api'
import { HabitFormModal } from './HabitFormModal'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'done', label: 'Completed' },
] as const

type HabitFilter = (typeof FILTERS)[number]['id']

const ICONS: Array<[RegExp, string]> = [
  [/gym|workout|lift|exercise/i, '🏋️'],
  [/read/i, '📖'],
  [/water|drink/i, '💧'],
  [/meditat|mindful/i, '🧘'],
  [/walk/i, '🚶'],
  [/run|jog/i, '🏃'],
  [/sleep|bed/i, '😴'],
  [/write|journal/i, '✍️'],
  [/study|learn/i, '📚'],
  [/money|save|budget/i, '💰'],
]

function habitIcon(title: string): string {
  return ICONS.find(([pattern]) => pattern.test(title))?.[1] ?? '✦'
}

function weekProgress(habit: Habit, week: string[], today: string): number {
  if (habit.frequency === 'weekly') {
    return Math.round((Math.min(habit.periodCount, habit.targetPerPeriod) / habit.targetPerPeriod) * 100)
  }
  const elapsed = week.filter((date) => date <= today)
  if (elapsed.length === 0) {
    return 0
  }
  const done = elapsed.filter((date) => habit.checkinDates.includes(date)).length
  return Math.round((done / elapsed.length) * 100)
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3.5 8.2 6.4 11.2 12.5 4.8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="7" cy="7" r="4.25" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10.4 10.4 13.5 13.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function HabitsPage() {
  const push = useToast()
  const [habits, setHabits] = useState<Habit[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [archived, setArchived] = useState(false)
  const [filter, setFilter] = useState<HabitFilter>('all')
  const [query, setQuery] = useState('')
  const [menuId, setMenuId] = useState<number | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Habit | null>(null)
  const today = todayIso()
  const monday = isoWeekMonday(today)
  const week = DAY_LABELS.map((label, index) => ({ label, date: addDays(monday, index) }))
  const weekDates = week.map((day) => day.date)

  function load() {
    api<{ habits: Habit[] }>(`/api/habits${archived ? '?archived=1' : ''}`)
      .then((result) => {
        setHabits(result.habits)
        setError(null)
      })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Could not load habits'))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archived, formOpen])

  async function toggle(habit: Habit, date: string) {
    try {
      if (habit.checkinDates.includes(date)) {
        await api(`/api/habits/${habit.id}/checkins/${date}`, { method: 'DELETE' })
      } else {
        await api(`/api/habits/${habit.id}/checkins`, { method: 'POST', body: JSON.stringify({ date }) })
      }
      load()
    } catch (caught) {
      push({ tone: 'error', message: caught instanceof Error ? caught.message : 'Could not update the check-in' })
    }
  }

  async function archive(habit: Habit) {
    try {
      await api(`/api/habits/${habit.id}/${habit.archivedAt ? 'unarchive' : 'archive'}`, { method: 'POST' })
      setMenuId(null)
      load()
    } catch (caught) {
      push({ tone: 'error', message: caught instanceof Error ? caught.message : 'Could not update the habit' })
    }
  }

  async function remove() {
    if (!pendingDelete) return
    try {
      await api(`/api/habits/${pendingDelete.id}`, { method: 'DELETE' })
      setPendingDelete(null)
      load()
    } catch (caught) {
      push({ tone: 'error', message: caught instanceof Error ? caught.message : 'Could not delete the habit' })
    }
  }

  const loaded = habits ?? []
  const todayDone = loaded.filter((habit) => habit.todayChecked).length
  const weekly =
    loaded.length === 0
      ? 0
      : Math.round(loaded.reduce((sum, habit) => sum + weekProgress(habit, weekDates, today), 0) / loaded.length)
  const needle = query.trim().toLowerCase()
  const visible = loaded.filter((habit) => {
    if (needle && !habit.title.toLowerCase().includes(needle)) return false
    if (filter === 'pending') return !habit.todayChecked
    if (filter === 'done') return habit.todayChecked
    return true
  })

  return (
    <section>
      <div className="habits-head">
        <div>
          <p className="eyebrow">Habit management</p>
          <h1>My Habits</h1>
          <p className="lede">Track all your daily routines in one place</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setFormOpen(true)}>
          + Add habit
        </button>
      </div>

      <div className="habit-stats">
        <article className="habit-stat">
          <span>Total Habits</span>
          <b>{habits ? loaded.length : '…'}</b>
        </article>
        <article className="habit-stat">
          <span>Today Completed</span>
          <b>{habits ? `${todayDone}/${loaded.length}` : '…'}</b>
        </article>
        <article className="habit-stat">
          <span>Weekly Completion</span>
          <b>{habits ? `${weekly}%` : '…'}</b>
        </article>
      </div>

      <div className="habit-toolbar">
        <div className="habit-filters">
          {FILTERS.map((item) => (
            <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>
              {item.label}
            </button>
          ))}
          <button type="button" aria-pressed={archived} onClick={() => setArchived((current) => !current)}>
            Archived
          </button>
        </div>
        <label className="habit-search">
          <SearchIcon />
          <input
            value={query}
            placeholder="Search habits..."
            aria-label="Search habits"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>

      {error ? <EmptyState title="Could not load habits" hint={error} /> : null}
      {habits === null && !error ? <p className="muted">Loading habits…</p> : null}
      {habits && loaded.length === 0 ? <EmptyState title="No habits yet" hint="A small daily promise counts." /> : null}

      {loaded.length > 0 ? (
        <div className="habit-board">
          <div className="habit-row habit-row-head">
            <span>Habit</span>
            {week.map((day) => (
              <div key={day.date} className="day-col">
                <span>{day.label.toUpperCase()}</span>
                <small>{Number(day.date.slice(8))}</small>
              </div>
            ))}
            <span className="habit-progress">Progress</span>
          </div>
          {visible.length === 0 ? <p className="muted" style={{ padding: '18px' }}>No habits match.</p> : null}
          {visible.map((habit) => (
            <article key={habit.id} className="habit-row" aria-label={habit.title}>
              <div className="habit-person">
                <span className="habit-mark" aria-hidden="true">
                  {habitIcon(habit.title)}
                </span>
                <div>
                  <h2>{habit.title}</h2>
                  <p className="habit-freq">
                    {habit.frequency === 'daily' ? 'Every day' : `${habit.periodCount} of ${habit.targetPerPeriod} this week`}
                    {habit.goalTitle ? (
                      <>
                        {' · '}
                        <Link to={`/goals/${habit.goalId}`}>{habit.goalTitle}</Link>
                      </>
                    ) : null}
                  </p>
                </div>
                <button
                  type="button"
                  className="habit-more"
                  aria-label={`Actions for ${habit.title}`}
                  aria-expanded={menuId === habit.id}
                  onClick={() => setMenuId((current) => (current === habit.id ? null : habit.id))}
                >
                  ···
                </button>
                {menuId === habit.id ? (
                  <div className="habit-menu">
                    <button type="button" onClick={() => void archive(habit)}>
                      {habit.archivedAt ? 'Unarchive' : 'Archive'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuId(null)
                        setPendingDelete(habit)
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ) : null}
              </div>
              {week.map((day) => {
                const checked = habit.checkinDates.includes(day.date)
                const future = day.date > today
                return (
                  <div key={day.date} className="day-col">
                    <button
                      type="button"
                      className="check-day"
                      aria-pressed={checked}
                      aria-label={`${checked ? 'Clear' : 'Check'} ${habit.title} on ${day.date}`}
                      disabled={future || Boolean(habit.archivedAt)}
                      onClick={() => void toggle(habit, day.date)}
                    >
                      {checked ? <CheckIcon /> : '–'}
                    </button>
                  </div>
                )
              })}
              <span className="habit-progress">{weekProgress(habit, weekDates, today)}%</span>
            </article>
          ))}
        </div>
      ) : null}

      <HabitFormModal open={formOpen} onClose={() => setFormOpen(false)} onSaved={load} />
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this habit?"
        body="Check-ins for this habit are deleted too."
        confirmLabel="Delete habit"
        danger
        onConfirm={() => void remove()}
        onClose={() => setPendingDelete(null)}
      />
    </section>
  )
}
