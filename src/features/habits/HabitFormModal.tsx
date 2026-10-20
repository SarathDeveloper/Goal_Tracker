import { fieldErrors, habitInputSchema } from '@shared/schemas'
import type { GoalList, Habit, HabitFrequency } from '@shared/types'
import { useEffect, useState, type FormEvent } from 'react'
import { FormField } from '../../components/FormField'
import { Modal } from '../../components/Modal'
import { useToast } from '../../components/toastContext'
import { api } from '../../lib/api'

interface HabitFormModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export function HabitFormModal(props: HabitFormModalProps) {
  if (!props.open) {
    return null
  }
  return <HabitForm {...props} />
}

function HabitForm({ onClose, onSaved }: HabitFormModalProps) {
  const push = useToast()
  const [title, setTitle] = useState('')
  const [frequency, setFrequency] = useState<HabitFrequency>('daily')
  const [target, setTarget] = useState('3')
  const [goalId, setGoalId] = useState('')
  const [goals, setGoals] = useState<GoalList['goals']>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false
    api<GoalList>('/api/goals')
      .then((result) => {
        if (!cancelled) setGoals(result.goals)
      })
      .catch(() => {
        if (!cancelled) setGoals([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const parsed = habitInputSchema.safeParse({
      title,
      frequency,
      targetPerPeriod: frequency === 'daily' ? 1 : Number(target),
      goalId: goalId ? Number(goalId) : null,
    })
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      return
    }
    try {
      await api<Habit>('/api/habits', { method: 'POST', body: JSON.stringify(parsed.data) })
      push({ message: 'Habit saved' })
      onSaved()
      onClose()
    } catch (caught) {
      push({ tone: 'error', message: caught instanceof Error ? caught.message : 'Could not save the habit' })
    }
  }

  return (
    <Modal open title="New habit" onClose={onClose}>
      <form className="form-grid" onSubmit={onSubmit} noValidate>
        <FormField label="Title" htmlFor="habit-title" error={errors.title}>
          <input id="habit-title" value={title} onChange={(event) => setTitle(event.target.value)} />
        </FormField>
        <div className="two">
          <FormField label="Frequency" htmlFor="habit-frequency">
            <select id="habit-frequency" value={frequency} onChange={(event) => setFrequency(event.target.value as HabitFrequency)}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </FormField>
          {frequency === 'weekly' ? (
            <FormField label="Days per week" htmlFor="habit-target" error={errors.targetPerPeriod}>
              <input id="habit-target" inputMode="numeric" value={target} onChange={(event) => setTarget(event.target.value)} />
            </FormField>
          ) : null}
        </div>
        <FormField label="Linked goal" htmlFor="habit-goal">
          <select id="habit-goal" value={goalId} onChange={(event) => setGoalId(event.target.value)}>
            <option value="">None</option>
            {goals.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.title}
              </option>
            ))}
          </select>
        </FormField>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Save habit
          </button>
        </div>
      </form>
    </Modal>
  )
}
