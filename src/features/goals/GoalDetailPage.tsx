import type { Category, Goal, GoalDetail, GoalStatus, ProgressEntry } from '@shared/types'
import { fieldErrors, milestoneInputSchema, progressInputSchema } from '@shared/schemas'
import { todayIso } from '@shared/dates'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { EmptyState } from '../../components/EmptyState'
import { FormField } from '../../components/FormField'
import { ProgressBar } from '../../components/ProgressBar'
import { useToast } from '../../components/toastContext'
import { api } from '../../lib/api'
import { formatDate, formatNumber } from '../../lib/format'
import { GoalFormModal } from './GoalFormModal'
import { PRIORITY_LABELS, STATUS_LABELS } from './labels'

export function GoalDetailPage() {
  const params = useParams()
  const navigate = useNavigate()
  const push = useToast()
  const [goal, setGoal] = useState<GoalDetail | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [milestoneTitle, setMilestoneTitle] = useState('')
  const [milestoneDue, setMilestoneDue] = useState('')
  const [milestoneError, setMilestoneError] = useState('')
  const [entryDate, setEntryDate] = useState(todayIso())
  const [entryValue, setEntryValue] = useState('')
  const [entryNote, setEntryNote] = useState('')
  const [entryError, setEntryError] = useState('')

  function load() {
    api<GoalDetail>(`/api/goals/${params.id}`)
      .then((result) => {
        setGoal(result)
        setError(null)
      })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Could not load this goal'))
  }

  useEffect(() => {
    load()
    api<{ categories: Category[] }>('/api/categories')
      .then((result) => setCategories(result.categories))
      .catch(() => setCategories([]))
    // Reloading when the id changes is the point of this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  async function saveStatus(status: GoalStatus) {
    if (!goal) return
    try {
      await api<Goal>(`/api/goals/${goal.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: goal.title,
          description: goal.description,
          categoryId: goal.categoryId,
          priority: goal.priority,
          status,
          startDate: goal.startDate,
          targetDate: goal.targetDate,
          metricType: goal.metricType,
          startValue: goal.startValue,
          targetValue: goal.targetValue,
          unit: goal.unit,
        }),
      })
      load()
    } catch (caught) {
      push({ tone: 'error', message: caught instanceof Error ? caught.message : 'Could not update the status' })
    }
  }

  async function toggleArchive() {
    if (!goal) return
    try {
      await api(`/api/goals/${goal.id}/${goal.archivedAt ? 'unarchive' : 'archive'}`, { method: 'POST' })
      load()
    } catch (caught) {
      push({ tone: 'error', message: caught instanceof Error ? caught.message : 'Could not update the goal' })
    }
  }

  async function remove() {
    if (!goal) return
    try {
      await api(`/api/goals/${goal.id}`, { method: 'DELETE' })
      navigate('/goals')
    } catch (caught) {
      push({ tone: 'error', message: caught instanceof Error ? caught.message : 'Could not delete the goal' })
    }
  }

  async function addMilestone(event: FormEvent) {
    event.preventDefault()
    if (!goal) return
    const parsed = milestoneInputSchema.safeParse({ title: milestoneTitle, dueDate: milestoneDue })
    if (!parsed.success) {
      setMilestoneError(fieldErrors(parsed.error).title ?? 'Check the milestone')
      return
    }
    try {
      await api(`/api/goals/${goal.id}/milestones`, { method: 'POST', body: JSON.stringify(parsed.data) })
      setMilestoneTitle('')
      setMilestoneDue('')
      setMilestoneError('')
      load()
    } catch (caught) {
      push({ tone: 'error', message: caught instanceof Error ? caught.message : 'Could not add the milestone' })
    }
  }

  async function move(index: number, direction: -1 | 1) {
    if (!goal) return
    const ids = goal.milestones.map((milestone) => milestone.id)
    const next = index + direction
    if (next < 0 || next >= ids.length) return
    const swapped = [...ids]
    const current = swapped[index]
    swapped[index] = swapped[next]
    swapped[next] = current
    try {
      await api(`/api/goals/${goal.id}/milestones/reorder`, { method: 'POST', body: JSON.stringify({ ids: swapped }) })
      load()
    } catch (caught) {
      push({ tone: 'error', message: caught instanceof Error ? caught.message : 'Could not reorder milestones' })
    }
  }

  async function addEntry(event: FormEvent) {
    event.preventDefault()
    if (!goal) return
    const value = Number(entryValue)
    if (!Number.isFinite(value)) {
      setEntryError('Enter a number')
      return
    }
    const parsed = progressInputSchema.safeParse({ entryDate, value, note: entryNote })
    if (!parsed.success) {
      setEntryError(Object.values(fieldErrors(parsed.error))[0] ?? 'Check the entry')
      return
    }
    try {
      await api(`/api/goals/${goal.id}/progress`, { method: 'POST', body: JSON.stringify(parsed.data) })
      setEntryValue('')
      setEntryNote('')
      setEntryError('')
      load()
    } catch (caught) {
      push({ tone: 'error', message: caught instanceof Error ? caught.message : 'Could not log progress' })
    }
  }

  async function removeEntry(entry: ProgressEntry) {
    try {
      await api(`/api/progress/${entry.id}`, { method: 'DELETE' })
      load()
    } catch (caught) {
      push({ tone: 'error', message: caught instanceof Error ? caught.message : 'Could not delete the entry' })
    }
  }

  if (error) {
    return <EmptyState title="Goal unavailable" hint={error} action={<Link to="/goals">Back to goals</Link>} />
  }
  if (!goal) {
    return <p className="muted">Loading goal…</p>
  }

  const showProgress = goal.metricType === 'numeric' || goal.milestoneCount > 0

  return (
    <section>
      <Link className="back" to="/goals">
        All goals
      </Link>
      <div className="page-head">
        <h1 className="detail-title">{goal.title}</h1>
        <div className="actions">
          <button type="button" className="btn btn-ghost" onClick={() => setEditing(true)}>
            Edit
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => void toggleArchive()}>
            {goal.archivedAt ? 'Unarchive' : 'Archive'}
          </button>
          <button type="button" className="btn btn-danger" onClick={() => setConfirmDelete(true)}>
            Delete
          </button>
        </div>
      </div>
      {goal.description ? <p className="description">{goal.description}</p> : null}
      <div className="meta-row">
        {goal.categoryName ? (
          <span className="chip">
            <i style={{ background: goal.categoryColor ?? '#8a8175' }} />
            {goal.categoryName}
          </span>
        ) : null}
        <span className={`priority priority-${goal.priority}`}>{PRIORITY_LABELS[goal.priority]}</span>
        {goal.targetDate ? <span>Due {formatDate(goal.targetDate)}</span> : null}
        {goal.overdue ? <span className="pill pill-warn">Overdue</span> : null}
        {goal.archivedAt ? <span className="pill">Archived</span> : null}
        {goal.metricType === 'numeric' ? (
          <span>
            {formatNumber(goal.startValue ?? 0)} to {formatNumber(goal.targetValue ?? 0)} {goal.unit}
          </span>
        ) : null}
      </div>
      <div className="actions" style={{ margin: '14px 0' }}>
        {(Object.keys(STATUS_LABELS) as GoalStatus[]).map((status) => (
          <button
            key={status}
            type="button"
            className={goal.status === status ? 'btn btn-primary' : 'btn btn-ghost'}
            onClick={() => void saveStatus(status)}
          >
            {STATUS_LABELS[status]}
          </button>
        ))}
      </div>
      {showProgress ? (
        <p>
          {goal.progressPercent}% complete
          <ProgressBar value={goal.progressPercent} />
        </p>
      ) : null}

      {goal.metricType === 'milestones' ? (
        <div className="panel" style={{ marginTop: 18 }}>
          <h2>Milestones</h2>
          {goal.milestones.length === 0 ? <p className="muted">Add the steps that make this goal real.</p> : null}
          {goal.milestones.map((milestone, index) => (
            <div key={milestone.id} className={milestone.completedAt ? 'milestone done' : 'milestone'}>
              <input
                type="checkbox"
                aria-label={`Toggle ${milestone.title}`}
                checked={milestone.completedAt !== null}
                onChange={() => {
                  void api(`/api/milestones/${milestone.id}/toggle`, { method: 'POST' }).then(load).catch((caught: unknown) => {
                    push({ tone: 'error', message: caught instanceof Error ? caught.message : 'Could not update the milestone' })
                  })
                }}
              />
              <label>
                <span>
                  {milestone.title}
                  {milestone.dueDate ? <small className="muted"> · {formatDate(milestone.dueDate)}</small> : null}
                </span>
              </label>
              <div className="actions">
                <button type="button" className="btn btn-ghost" onClick={() => void move(index, -1)} disabled={index === 0}>
                  Up
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => void move(index, 1)}
                  disabled={index === goal.milestones.length - 1}
                >
                  Down
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    void api(`/api/milestones/${milestone.id}`, { method: 'DELETE' }).then(load)
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          <form className="two" onSubmit={addMilestone} style={{ marginTop: 12 }}>
            <FormField label="New milestone" htmlFor="milestone-title" error={milestoneError}>
              <input id="milestone-title" value={milestoneTitle} onChange={(event) => setMilestoneTitle(event.target.value)} />
            </FormField>
            <FormField label="Due" htmlFor="milestone-due">
              <input id="milestone-due" type="date" value={milestoneDue} onChange={(event) => setMilestoneDue(event.target.value)} />
            </FormField>
            <button type="submit" className="btn btn-primary">
              Add milestone
            </button>
          </form>
        </div>
      ) : (
        <div className="panel" style={{ marginTop: 18 }}>
          <h2>Progress log</h2>
          <ProgressChart goal={goal} />
          <form className="form-grid" onSubmit={addEntry}>
            <div className="two">
              <FormField label="Date" htmlFor="entry-date" error={entryError}>
                <input id="entry-date" type="date" value={entryDate} onChange={(event) => setEntryDate(event.target.value)} />
              </FormField>
              <FormField label={`Value${goal.unit ? ` (${goal.unit})` : ''}`} htmlFor="entry-value">
                <input id="entry-value" inputMode="decimal" value={entryValue} onChange={(event) => setEntryValue(event.target.value)} />
              </FormField>
            </div>
            <FormField label="Note" htmlFor="entry-note">
              <input id="entry-note" value={entryNote} onChange={(event) => setEntryNote(event.target.value)} />
            </FormField>
            <button type="submit" className="btn btn-primary">
              Log progress
            </button>
          </form>
          {goal.progressEntries.map((entry) => (
            <div key={entry.id} className="entry">
              <div>
                <strong>
                  {formatNumber(entry.value)} {goal.unit}
                </strong>
                <div className="muted">
                  {formatDate(entry.entryDate)}
                  {entry.note ? ` · ${entry.note}` : ''}
                </div>
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => void removeEntry(entry)}>
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      <GoalFormModal open={editing} goal={goal} categories={categories} onClose={() => setEditing(false)} onSaved={load} />
      <ConfirmDialog
        open={confirmDelete}
        title="Delete this goal?"
        body="Milestones and progress entries for this goal are deleted too. This cannot be undone."
        confirmLabel="Delete goal"
        danger
        onConfirm={() => void remove()}
        onClose={() => setConfirmDelete(false)}
      />
    </section>
  )
}

function ProgressChart({ goal }: { goal: GoalDetail }) {
  const points = [...goal.progressEntries].sort((a, b) => a.entryDate.localeCompare(b.entryDate) || a.id - b.id)
  if (points.length === 0 || goal.startValue === null || goal.targetValue === null) {
    return <p className="muted">Log a value to see the chart.</p>
  }
  const values = [goal.startValue, goal.targetValue, ...points.map((entry) => entry.value)]
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const width = 640
  const height = 180
  const coords = points.map((entry, index) => {
    const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * (width - 40) + 20
    const y = 20 + ((max - entry.value) / span) * 130
    return `${x},${y}`
  })
  return (
    <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Progress over time">
      <polyline fill="none" stroke="#0f6e6b" strokeWidth="3" points={coords.join(' ')} />
      {coords.map((pair, index) => {
        const [x, y] = pair.split(',')
        return <circle key={points[index].id} cx={x} cy={y} r="4" fill="#0f6e6b" />
      })}
    </svg>
  )
}
