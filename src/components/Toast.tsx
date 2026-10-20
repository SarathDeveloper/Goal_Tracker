import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { ToastContext, type ToastInput } from './toastContext'

interface ToastItem extends ToastInput {
  id: number
}

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const push = useCallback((toast: ToastInput) => {
    const id = nextId
    nextId += 1
    setToasts((current) => [...current, { ...toast, id, tone: toast.tone ?? 'info' }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id))
    }, 4000)
  }, [])
  const value = useMemo(() => push, [push])
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.tone}`}>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
