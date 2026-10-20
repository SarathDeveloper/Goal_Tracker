import type { Dashboard, Habit } from '@shared/types'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart } from '../../components/BarChart'
import { EmptyState } from '../../components/EmptyState'
import { useToast } from '../../components/toastContext'
import { api } from '../../lib/api'
import { formatDate } from '../../lib/format'

export function DashboardPage() {
  const push = useToast()
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [error, setError] = useState<string | null>(null)

  function load() {
    api<Dashboard>('/api/dashboard')
      .then((result) => {
        setDashboard(result)
        setError(null)
      })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Could not load the dashboard'))
  }

  useEffect(() => {
    load()
  }, [])

  async function toggleHabit(habit: Habit) {
    if (!dashboard) return
    try {
      if (habit.todayChecked) {
        await api(`/api/habits/${habit.id}/checkins/${dashboard.today}`, { method: 'DELETE' })
      } else {
        await api(`/api/habits/${habit.id}/checkins`, {
          method: 'POST',
          body: JSON.stringify({ date: dashboard.today }),
        })
      }
      load()
    } catch (caught) {
      push({ tone: 'error', message: caught instanceof Error ? caught.message : 'Could not update the habit' })
    }
  }

  if (error) {
    return (
      <EmptyState
        title="Could not load the dashboard"
        hint={error}
        action={
          <button type="button" className="btn btn-primary" onClick={load}>
            Retry
          </button>
        }
      />
    )
  }
  if (!dashboard) {
    return <p className="muted">Loading dashboard…</p>
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Today</h1>
          <p className="lede">{formatDate(dashboard.today)}</p>
        </div>
      </div>
      <div className="stats">
        <div className="stat">
          <b>{dashboard.counts.active}</b>
          <span>Active</span>
        </div>
        <div className="stat">
          <b>{dashboard.counts.completed}</b>
          <span>Completed</span>
        </div>
        <div className="stat">
          <b>{dashboard.counts.overdue}</b>
          <span>Overdue</span>
        </div>
        <div className="stat">
          <b>{dashboard.averageProgress}%</b>
          <span>Average progress</span>
        </div>
      </div>
      <div className="split">
        <div className="panel">
          <h2>Overdue</h2>
          {dashboard.overdue.length === 0 ? <p className="muted">Nothing is overdue.</p> : null}
          <ul>
            {dashboard.overdue.map((goal) => (
              <li key={goal.id}>
                <Link to={`/goals/${goal.id}`}>
                  <span>{goal.title}</span>
                  <span>{goal.targetDate ? formatDate(goal.targetDate) : ''}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="panel">
          <h2>Due this week</h2>
          {dashboard.dueSoon.length === 0 ? <p className="muted">Nothing is due in the next 7 days.</p> : null}
          <ul>
            {dashboard.dueSoon.map((goal) => (
              <li key={goal.id}>
                <Link to={`/goals/${goal.id}`}>
                  <span>{goal.title}</span>
                  <span>{goal.targetDate ? formatDate(goal.targetDate) : ''}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="panel" style={{ marginTop: 14 }}>
        <h2>Today&apos;s habits</h2>
        {dashboard.habitsToday.length === 0 ? <p className="muted">No active habits.</p> : null}
        <ul>
          {dashboard.habitsToday.map((habit) => (
            <li key={habit.id}>
              <label className="check">
                <input type="checkbox" checked={habit.todayChecked} onChange={() => void toggleHabit(habit)} />
                {habit.title}
                <span className="muted">
                  {habit.currentStreak} {habit.frequency === 'daily' ? 'day' : 'week'} streak
                </span>
              </label>
            </li>
          ))}
        </ul>
      </div>
      <div className="split" style={{ marginTop: 14 }}>
        <div className="panel">
          <h2>Completions</h2>
          <BarChart
            label="Goals completed over the last six months"
            items={dashboard.completionsByMonth.map((month) => ({ label: month.label, value: month.count }))}
          />
        </div>
        <div className="panel">
          <h2>By category</h2>
          {dashboard.byCategory.length === 0 ? (
            <p className="muted">Categories appear here once you have goals.</p>
          ) : (
            <BarChart
              label="Goals by category"
              items={dashboard.byCategory.map((category) => ({ label: category.name, value: category.count }))}
            />
          )}
        </div>
      </div>
    </section>
  )
}
