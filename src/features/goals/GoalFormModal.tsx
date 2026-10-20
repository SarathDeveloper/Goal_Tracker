import { fieldErrors, goalInputSchema } from '@shared/schemas'
import type { Category, Goal, GoalStatus, MetricType, Priority } from '@shared/types'
import { useState, type FormEvent } from 'react'
import { FormField } from '../../components/FormField'
import { Modal } from '../../components/Modal'
import { useToast } from '../../components/toastContext'
import { api } from '../../lib/api'
import { PRIORITY_LABELS, STATUS_LABELS } from './labels'

interface GoalFormModalProps {
  open: boolean
  goal: Goal | null
  categories: Category[]
  onClose: () => void
  onSaved: (goal: Goal) => void
}

interface FormState {
  title: string
  description: string
  categoryId: string
  priority: Priority
  status: GoalStatus
  startDate: string
  targetDate: string
  metricType: MetricType
  startValue: string
  targetValue: string
  unit: string
}

function emptyForm(): FormState {
  return {
    title: '',
    description: '',
    categoryId: '',
    priority: 'medium',
    status: 'not_started',
    startDate: '',
    targetDate: '',
    metricType: 'milestones',
    startValue: '',
    targetValue: '',
    unit: '',
  }
}

function fromGoal(goal: Goal): FormState {
  return {
    title: goal.title,
    description: goal.description,
    categoryId: goal.categoryId === null ? '' : String(goal.categoryId),
    priority: goal.priority,
    status: goal.status,
    startDate: goal.startDate ?? '',
    targetDate: goal.targetDate ?? '',
    metricType: goal.metricType,
    startValue: goal.startValue === null ? '' : String(goal.startValue),
    targetValue: goal.targetValue === null ? '' : String(goal.targetValue),
    unit: goal.unit,
  }
}

function parseNumber(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) {
    return null
  }
  const value = Number(trimmed)
  return Number.isFinite(value) ? value : Number.NaN
}

export function GoalFormModal(props: GoalFormModalProps) {
  if (!props.open) {
    return null
  }
  return <GoalForm key={props.goal?.id ?? 'new'} {...props} />
}

function GoalForm({ goal, categories, onClose, onSaved }: GoalFormModalProps) {
  const push = useToast()
  const [form, setForm] = useState<FormState>(() => (goal ? fromGoal(goal) : emptyForm()))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const numeric = form.metricType === 'numeric'
    if (numeric && form.startValue.trim() && !Number.isFinite(Number(form.startValue))) {
      setErrors({ startValue: 'Enter a number' })
      return
    }
    if (numeric && form.targetValue.trim() && !Number.isFinite(Number(form.targetValue))) {
      setErrors({ targetValue: 'Enter a number' })
      return
    }
    const draft = {
      title: form.title,
      description: form.description,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      priority: form.priority,
      status: form.status,
      startDate: form.startDate,
      targetDate: form.targetDate,
      metricType: form.metricType,
      startValue: numeric ? parseNumber(form.startValue) : null,
      targetValue: numeric ? parseNumber(form.targetValue) : null,
      unit: numeric ? form.unit : '',
    }
    const parsed = goalInputSchema.safeParse(draft)
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      return
    }
    setSaving(true)
    try {
      const saved = goal
        ? await api<Goal>(`/api/goals/${goal.id}`, { method: 'PUT', body: JSON.stringify(parsed.data) })
        : await api<Goal>('/api/goals', { method: 'POST', body: JSON.stringify(parsed.data) })
      push({ message: goal ? 'Goal updated' : 'Goal saved' })
      onSaved(saved)
      onClose()
    } catch (error) {
      push({ tone: 'error', message: error instanceof Error ? error.message : 'Could not save the goal' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open title={goal ? 'Edit goal' : 'New goal'} onClose={onClose}>
      <form className="form-grid" onSubmit={onSubmit} noValidate>
        <FormField label="Title" htmlFor="goal-title" error={errors.title}>
          <input id="goal-title" value={form.title} onChange={(event) => set('title', event.target.value)} />
        </FormField>
        <FormField label="Description" htmlFor="goal-description" error={errors.description}>
          <textarea id="goal-description" value={form.description} onChange={(event) => set('description', event.target.value)} />
        </FormField>
        <div className="two">
          <FormField label="Category" htmlFor="goal-category" error={errors.categoryId}>
            <select id="goal-category" value={form.categoryId} onChange={(event) => set('categoryId', event.target.value)}>
              <option value="">No category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Priority" htmlFor="goal-priority" error={errors.priority}>
            <select id="goal-priority" value={form.priority} onChange={(event) => set('priority', event.target.value as Priority)}>
              {(Object.keys(PRIORITY_LABELS) as Priority[]).map((priority) => (
                <option key={priority} value={priority}>
                  {PRIORITY_LABELS[priority]}
                </option>
              ))}
            </select>
          </FormField>
        </div>
        <div className="two">
          <FormField label="Status" htmlFor="goal-status" error={errors.status}>
            <select id="goal-status" value={form.status} onChange={(event) => set('status', event.target.value as GoalStatus)}>
              {(Object.keys(STATUS_LABELS) as GoalStatus[]).map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Progress" htmlFor="goal-metric" error={errors.metricType}>
            <select id="goal-metric" value={form.metricType} onChange={(event) => set('metricType', event.target.value as MetricType)}>
              <option value="milestones">Milestones</option>
              <option value="numeric">Measurable number</option>
            </select>
          </FormField>
        </div>
        <div className="two">
          <FormField label="Start date" htmlFor="goal-start" error={errors.startDate}>
            <input id="goal-start" type="date" value={form.startDate} onChange={(event) => set('startDate', event.target.value)} />
          </FormField>
          <FormField label="Target date" htmlFor="goal-target" error={errors.targetDate}>
            <input id="goal-target" type="date" value={form.targetDate} onChange={(event) => set('targetDate', event.target.value)} />
          </FormField>
        </div>
        {form.metricType === 'numeric' ? (
          <div className="two">
            <FormField label="Starting value" htmlFor="goal-start-value" error={errors.startValue}>
              <input id="goal-start-value" inputMode="decimal" value={form.startValue} onChange={(event) => set('startValue', event.target.value)} />
            </FormField>
            <FormField label="Target value" htmlFor="goal-target-value" error={errors.targetValue}>
              <input id="goal-target-value" inputMode="decimal" value={form.targetValue} onChange={(event) => set('targetValue', event.target.value)} />
            </FormField>
            <FormField label="Unit" htmlFor="goal-unit" error={errors.unit}>
              <input id="goal-unit" value={form.unit} onChange={(event) => set('unit', event.target.value)} placeholder="km, pages, hours" />
            </FormField>
          </div>
        ) : null}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save goal'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
