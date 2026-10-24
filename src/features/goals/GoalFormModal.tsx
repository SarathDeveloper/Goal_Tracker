import { parseMeasurement, sameUnit } from '@shared/measurement'
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
  startText: string
  targetText: string
  remind: boolean
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
    startText: '',
    targetText: '',
    remind: true,
  }
}

function measurementText(value: number | null, unit: string, label: string): string {
  if (label.trim()) {
    return label
  }
  if (value === null) {
    return ''
  }
  return unit ? `${value} ${unit}` : String(value)
}

function trackingHint(raw: string): string | null {
  const parsed = parseMeasurement(raw)
  if (parsed.value === null) {
    return null
  }
  return parsed.unit ? `Tracking: ${parsed.value} ${parsed.unit}` : `Tracking: ${parsed.value}`
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
    startText: measurementText(goal.startValue, goal.unit, goal.startLabel),
    targetText: measurementText(goal.targetValue, goal.unit, goal.targetLabel),
    remind: goal.remind,
  }
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
    const start = numeric ? parseMeasurement(form.startText) : { value: null, unit: '' }
    const target = numeric ? parseMeasurement(form.targetText) : { value: null, unit: '' }
    if (numeric) {
      const invalid: Record<string, string> = {}
      if (start.value === null) {
        invalid.startText = 'Include a number, like 64 kg'
      }
      if (target.value === null) {
        invalid.targetText = 'Include a number, like 64 kg'
      }
      if (start.unit && target.unit && !sameUnit(start.unit, target.unit)) {
        invalid.targetText = 'Use the same unit for start and target'
      }
      if (Object.keys(invalid).length > 0) {
        setErrors(invalid)
        return
      }
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
      startValue: start.value,
      targetValue: target.value,
      unit: target.unit || start.unit,
      startLabel: numeric ? form.startText : '',
      targetLabel: numeric ? form.targetText : '',
      remind: form.remind,
    }
    const parsed = goalInputSchema.safeParse(draft)
    if (!parsed.success) {
      const fields = fieldErrors(parsed.error)
      const next = { ...fields }
      const startMessage = fields.startLabel ?? fields.startValue
      const targetMessage = fields.targetLabel ?? fields.targetValue ?? fields.unit
      if (startMessage) {
        next.startText = startMessage
      }
      if (targetMessage) {
        next.targetText = targetMessage
      }
      setErrors(next)
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
            <FormField label="Starting point" htmlFor="goal-start-value" error={errors.startText}>
              <input
                id="goal-start-value"
                value={form.startText}
                placeholder="starting from 64 kg"
                onChange={(event) => set('startText', event.target.value)}
              />
              {trackingHint(form.startText) ? <span className="muted">{trackingHint(form.startText)}</span> : null}
            </FormField>
            <FormField label="Target" htmlFor="goal-target-value" error={errors.targetText}>
              <input
                id="goal-target-value"
                value={form.targetText}
                placeholder="75 kg"
                onChange={(event) => set('targetText', event.target.value)}
              />
              {trackingHint(form.targetText) ? <span className="muted">{trackingHint(form.targetText)}</span> : null}
            </FormField>
          </div>
        ) : null}
        <div>
          <label className="check">
            <input
              id="goal-remind"
              type="checkbox"
              checked={form.remind}
              onChange={(event) => set('remind', event.target.checked)}
            />
            Remind me
          </label>
          <p className="muted">Uses the daily check time in Settings.</p>
        </div>
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
