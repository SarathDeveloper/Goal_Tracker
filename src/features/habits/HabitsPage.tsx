import { addDays, isoWeekMonday, todayIso } from '@shared/dates'
import type { Habit } from '@shared/types'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { EmptyState } from '../../components/EmptyState'
import { useToast } from '../../components/toastContext'
import { api } from '../../lib/api'
import { formatDate } from '../../lib/format'
import { HabitFormModal } from './HabitFormModal'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function HabitsPage() {
  const push = useToast()
  const [habits, setHabits] = useState<Habit[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [archived, setArchived] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Habit | null>(null)
  const today = todayIso()
  const monday = isoWeekMonday(today)
  const week = DAY_LABELS.map((label, index) => ({ label, date: addDays(monday, index) }))

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

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Habits</h1>
          <p className="lede">Week of {formatDate(monday)}</p>
        </div>
        <div className="actions">
          <label className="check">
            <input type="checkbox" checked={archived} onChange={(event) => setArchived(event.target.checked)} />
            Archived
          </label>
          <button type="button" className="btn btn-primary" onClick={() => setFormOpen(true)}>
            New habit
          </button>
        </div>
      </div>
      {error ? <EmptyState title="Could not load habits" hint={error} /> : null}
      {habits && habits.length === 0 ? <EmptyState title="No habits yet" hint="A small daily promise counts." /> : null}
      <div className="stack">
        {habits?.map((habit) => (
          <article key={habit.id} className="habit-card" aria-label={habit.title}>
            <div className="habit-top">
              <div>
                <h2>{habit.title}</h2>
                <p className="muted">
                  {habit.frequency === 'daily' ? 'Every day' : `${habit.targetPerPeriod} days a week`}
                  {' · '}
                  {habit.currentStreak} {habit.frequency === 'daily' ? 'day' : 'week'} streak
                  {habit.longestStreak > habit.currentStreak ? ` · longest ${habit.longestStreak}` : ''}
                  {habit.goalTitle ? (
                    <>
                      {' · '}
                      <Link to={`/goals/${habit.goalId}`}>{habit.goalTitle}</Link>
                    </>
                  ) : null}
                </p>
              </div>
              <div className="actions">
                <button type="button" className="btn btn-ghost" onClick={() => void archive(habit)}>
                  {habit.archivedAt ? 'Unarchive' : 'Archive'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setPendingDelete(habit)}>
                  Delete
                </button>
              </div>
            </div>
            <div className="week" style={{ marginTop: 12 }}>
              {week.map((day) => {
                const checked = habit.checkinDates.includes(day.date)
                const future = day.date > today
                return (
                  <div key={day.date}>
                    <div className="week-label">{day.label}</div>
                    <button
                      type="button"
                      className="day"
                      aria-pressed={checked}
                      aria-label={`${checked ? 'Clear' : 'Check'} ${habit.title} on ${day.date}`}
                      disabled={future || Boolean(habit.archivedAt)}
                      onClick={() => void toggle(habit, day.date)}
                    >
                      {day.date.slice(8)}
                    </button>
                  </div>
                )
              })}
            </div>
            {habit.frequency === 'weekly' ? (
              <p className="muted">
                {habit.periodCount} of {habit.targetPerPeriod} this week
              </p>
            ) : null}
          </article>
        ))}
      </div>
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
