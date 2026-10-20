import type { DueReminder } from '@shared/types'
import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { notifyDesktop } from './desktopNotify'

export function ReminderBanner() {
  const [items, setItems] = useState<DueReminder[]>([])
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function poll() {
      try {
        const result = await api<{ reminders: DueReminder[] }>('/api/reminders/due')
        if (cancelled || result.reminders.length === 0) {
          return
        }
        setItems(result.reminders)
        setHidden(false)
        await notifyDesktop(result.reminders)
      } catch {
        // A missed poll should not block the rest of the app.
      }
    }
    void poll()
    const timer = window.setInterval(() => void poll(), 60_000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  if (hidden || items.length === 0) {
    return null
  }

  return (
    <div className="banner" role="status">
      <div>
        <strong>Reminders</strong>
        <ul>
          {items.map((item) => (
            <li key={`${item.kind}-${item.id}`}>{item.detail}</li>
          ))}
        </ul>
      </div>
      <button type="button" className="btn btn-ghost" onClick={() => setHidden(true)}>
        Dismiss
      </button>
    </div>
  )
}
