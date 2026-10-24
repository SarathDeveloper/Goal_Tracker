import { todayIso } from '@shared/dates'
import { diaryEntryInputSchema, fieldErrors } from '@shared/schemas'
import type { DiaryEntry, DiaryMood } from '@shared/types'
import { useState, type FormEvent } from 'react'
import { FormField } from '../../components/FormField'
import { Modal } from '../../components/Modal'
import { useToast } from '../../components/toastContext'
import { api } from '../../lib/api'
import { MOODS } from './moods'

interface DiaryEntryModalProps {
  open: boolean
  entry: DiaryEntry | null
  onClose: () => void
  onSaved: () => void
}

export function DiaryEntryModal(props: DiaryEntryModalProps) {
  if (!props.open) {
    return null
  }
  return <DiaryEntryForm {...props} />
}

function DiaryEntryForm({ entry, onClose, onSaved }: DiaryEntryModalProps) {
  const push = useToast()
  const today = todayIso()
  const [date, setDate] = useState(entry?.entryDate ?? today)
  const [title, setTitle] = useState(entry?.title ?? '')
  const [body, setBody] = useState(entry?.body ?? '')
  const [mood, setMood] = useState<DiaryMood | null>(entry?.mood ?? null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const parsed = diaryEntryInputSchema.safeParse({ entryDate: date, title, body, mood })
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      return
    }
    try {
      await api<DiaryEntry>(entry ? `/api/diary/${entry.id}` : '/api/diary', {
        method: entry ? 'PUT' : 'POST',
        body: JSON.stringify(parsed.data),
      })
      push({ message: entry ? 'Entry updated' : 'Entry saved' })
      onSaved()
      onClose()
    } catch (caught) {
      push({ tone: 'error', message: caught instanceof Error ? caught.message : 'Could not save the entry' })
    }
  }

  return (
    <Modal open title={entry ? 'Edit entry' : 'New entry'} onClose={onClose}>
      <form className="form-grid" onSubmit={onSubmit} noValidate>
        <div className="two">
          <FormField label="Date" htmlFor="diary-date" error={errors.entryDate}>
            <input id="diary-date" type="date" max={today} value={date} onChange={(event) => setDate(event.target.value)} />
          </FormField>
          <FormField label="Title" htmlFor="diary-title" error={errors.title}>
            <input id="diary-title" value={title} onChange={(event) => setTitle(event.target.value)} />
          </FormField>
        </div>
        <div className="field">
          <span id="diary-mood-label">Mood</span>
          <div className="mood-picker" role="group" aria-labelledby="diary-mood-label">
            {MOODS.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={mood === item.value}
                aria-label={item.label}
                onClick={() => setMood(item.value)}
              >
                <span aria-hidden="true">{item.emoji}</span> {item.label}
              </button>
            ))}
            <button type="button" aria-pressed={mood === null} onClick={() => setMood(null)}>
              No mood
            </button>
          </div>
          {errors.mood ? (
            <span className="field-error" role="alert">
              {errors.mood}
            </span>
          ) : null}
        </div>
        <FormField label="Entry" htmlFor="diary-body" error={errors.body}>
          <textarea id="diary-body" value={body} onChange={(event) => setBody(event.target.value)} />
        </FormField>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Save entry
          </button>
        </div>
      </form>
    </Modal>
  )
}
