import type { Category, Goal, GoalList, GoalStatus, Priority } from '@shared/types'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../../components/EmptyState'
import { ProgressBar } from '../../components/ProgressBar'
import { api } from '../../lib/api'
import { formatDate } from '../../lib/format'
import { CategoriesModal } from './CategoriesModal'
import { GoalFormModal } from './GoalFormModal'
import { PRIORITY_LABELS, STATUS_LABELS } from './labels'

export function GoalsPage() {
  const [goals, setGoals] = useState<Goal[] | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')
  const [status, setStatus] = useState<'' | GoalStatus>('')
  const [categoryId, setCategoryId] = useState('')
  const [priority, setPriority] = useState<'' | Priority>('')
  const [sort, setSort] = useState('updated')
  const [archived, setArchived] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(q), 200)
    return () => window.clearTimeout(timer)
  }, [q])

  useEffect(() => {
    const params = new URLSearchParams()
    if (debounced) params.set('q', debounced)
    if (status) params.set('status', status)
    if (categoryId) params.set('categoryId', categoryId)
    if (priority) params.set('priority', priority)
    if (sort) params.set('sort', sort)
    if (archived) params.set('archived', '1')
    const query = params.toString()
    let cancelled = false
    api<GoalList>(`/api/goals${query ? `?${query}` : ''}`)
      .then((result) => {
        if (!cancelled) {
          setGoals(result.goals)
          setError(null)
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : 'Could not load goals')
      })
    return () => {
      cancelled = true
    }
  }, [debounced, status, categoryId, priority, sort, archived, revision])

  useEffect(() => {
    let cancelled = false
    api<{ categories: Category[] }>('/api/categories')
      .then((result) => {
        if (!cancelled) setCategories(result.categories)
      })
      .catch(() => {
        if (!cancelled) setCategories([])
      })
    return () => {
      cancelled = true
    }
  }, [revision])

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Goals</h1>
          <p className="lede">{goals ? `${goals.length} ${archived ? 'archived' : 'active'}` : 'Loading goals…'}</p>
        </div>
        <div className="actions">
          <button type="button" className="btn btn-ghost" onClick={() => setCategoriesOpen(true)}>
            Categories
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setFormOpen(true)}>
            New goal
          </button>
        </div>
      </div>
      <div className="filters">
        <label className="field grow">
          <span>Search</span>
          <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Title or description" />
        </label>
        <label className="field">
          <span>Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as '' | GoalStatus)}>
            <option value="">Any</option>
            {(Object.keys(STATUS_LABELS) as GoalStatus[]).map((item) => (
              <option key={item} value={item}>
                {STATUS_LABELS[item]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Category</span>
          <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">Any</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Priority</span>
          <select value={priority} onChange={(event) => setPriority(event.target.value as '' | Priority)}>
            <option value="">Any</option>
            {(Object.keys(PRIORITY_LABELS) as Priority[]).map((item) => (
              <option key={item} value={item}>
                {PRIORITY_LABELS[item]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Sort</span>
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="updated">Recently updated</option>
            <option value="target">Target date</option>
            <option value="priority">Priority</option>
            <option value="title">Title</option>
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={archived} onChange={(event) => setArchived(event.target.checked)} />
          Archived
        </label>
      </div>
      {error ? <EmptyState title="Could not load goals" hint={error} /> : null}
      {goals && goals.length === 0 ? (
        <EmptyState title={archived ? 'No archived goals' : 'No goals yet'} hint="Create a goal to start tracking it." />
      ) : null}
      <div className="goal-list">
        {goals?.map((goal) => (
          <Link key={goal.id} className="goal-card" to={`/goals/${goal.id}`}>
            <div className="goal-top">
              <h2>{goal.title}</h2>
              <span className={`badge badge-${goal.status}`}>{STATUS_LABELS[goal.status]}</span>
            </div>
            {goal.description ? <p className="clamp">{goal.description}</p> : null}
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
            </div>
            {goal.metricType === 'numeric' || goal.milestoneCount > 0 ? <ProgressBar value={goal.progressPercent} /> : null}
          </Link>
        ))}
      </div>
      <GoalFormModal
        open={formOpen}
        goal={null}
        categories={categories}
        onClose={() => setFormOpen(false)}
        onSaved={() => setRevision((current) => current + 1)}
      />
      <CategoriesModal
        open={categoriesOpen}
        categories={categories}
        onClose={() => setCategoriesOpen(false)}
        onChange={() => setRevision((current) => current + 1)}
      />
    </section>
  )
}
