import type { BackupStatus, Health, ReminderSettings } from '@shared/types'
import { reminderSettingsSchema } from '@shared/schemas'
import { useEffect, useState, type FormEvent } from 'react'
import { useToast } from '../../components/toastContext'
import { api, ApiError } from '../../lib/api'

async function download(path: string, filename: string): Promise<void> {
  const response = await fetch(path)
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null)
    const message =
      typeof body === 'object' && body && 'error' in body && typeof body.error === 'string' ? body.error : 'Download failed'
    throw new ApiError(response.status, message)
  }
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function SettingsPage() {
  const push = useToast()
  const [health, setHealth] = useState<Health | null>(null)
  const [status, setStatus] = useState<BackupStatus | null>(null)
  const [settings, setSettings] = useState<ReminderSettings | null>(null)
  const [restoring, setRestoring] = useState(false)

  useEffect(() => {
    api<Health>('/api/health').then(setHealth).catch(() => setHealth(null))
    api<BackupStatus>('/api/backup/status').then(setStatus).catch(() => setStatus(null))
    api<ReminderSettings>('/api/reminders/settings').then(setSettings).catch(() => setSettings(null))
  }, [])

  async function saveReminders(event: FormEvent) {
    event.preventDefault()
    if (!settings) return
    const parsed = reminderSettingsSchema.safeParse(settings)
    if (!parsed.success) {
      push({ tone: 'error', message: parsed.error.issues[0]?.message ?? 'Check the reminder settings' })
      return
    }
    try {
      const saved = await api<ReminderSettings>('/api/reminders/settings', {
        method: 'PUT',
        body: JSON.stringify(parsed.data),
      })
      setSettings(saved)
      push({ message: 'Reminder settings saved' })
    } catch (caught) {
      push({ tone: 'error', message: caught instanceof Error ? caught.message : 'Could not save reminder settings' })
    }
  }

  async function restore(file: File | undefined) {
    if (!file) return
    if (!window.confirm('Replace all current data with this backup? A snapshot of the current database is saved first.')) {
      return
    }
    setRestoring(true)
    try {
      const bytes = await file.arrayBuffer()
      const response = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: bytes,
      })
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null)
        const message =
          typeof body === 'object' && body && 'error' in body && typeof body.error === 'string'
            ? body.error
            : 'Could not restore the backup'
        throw new Error(message)
      }
      window.location.assign('/')
    } catch (caught) {
      push({ tone: 'error', message: caught instanceof Error ? caught.message : 'Could not restore the backup' })
      setRestoring(false)
    }
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p className="lede">Reminders, backups, and exports stay on this computer.</p>
        </div>
      </div>
      <div className="stack">
        <form className="panel form-grid" onSubmit={saveReminders}>
          <h2>Reminders</h2>
          {settings ? (
            <>
              <label className="check">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(event) => setSettings({ ...settings, enabled: event.target.checked })}
                />
                Enable reminders
              </label>
              <label className="field">
                <span>Days before a target date</span>
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={settings.daysBefore}
                  onChange={(event) => setSettings({ ...settings, daysBefore: Number(event.target.value) })}
                />
              </label>
              <label className="field">
                <span>Daily check time</span>
                <input
                  type="time"
                  value={settings.checkTime}
                  onChange={(event) => setSettings({ ...settings, checkTime: event.target.value })}
                />
              </label>
              <button type="submit" className="btn btn-primary">
                Save reminders
              </button>
            </>
          ) : (
            <p className="muted">Loading reminder settings…</p>
          )}
        </form>
        <div className="panel">
          <h2>Backup</h2>
          <p className="muted">Database: {health?.dbPath ?? status?.dbPath ?? '…'}</p>
          <p className="muted">Snapshots: {status?.backupDir ?? '…'}</p>
          <div className="actions">
            <button type="button" className="btn btn-primary" onClick={() => void download('/api/backup/download', 'goaltracker-backup.db').catch((caught: unknown) => push({ tone: 'error', message: caught instanceof Error ? caught.message : 'Download failed' }))}>
              Download backup
            </button>
            <label className="btn btn-ghost">
              {restoring ? 'Restoring…' : 'Restore backup'}
              <input
                type="file"
                accept=".db,application/octet-stream"
                hidden
                disabled={restoring}
                onChange={(event) => void restore(event.target.files?.[0])}
              />
            </label>
          </div>
        </div>
        <div className="panel">
          <h2>Export</h2>
          <div className="actions">
            <button type="button" className="btn btn-ghost" onClick={() => void download('/api/backup/export.json', 'goal-tracker.json')}>
              Export JSON
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => void download('/api/backup/export.csv?kind=goals', 'goals.csv')}>
              Goals CSV
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => void download('/api/backup/export.csv?kind=progress', 'progress.csv')}>
              Progress CSV
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => void download('/api/backup/export.csv?kind=habits', 'habits.csv')}>
              Habits CSV
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
