import type { ReactNode } from 'react'

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="panel empty">
      <h2>{title}</h2>
      {hint ? <p className="muted">{hint}</p> : null}
      {action}
    </div>
  )
}
