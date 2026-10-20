import { createContext, useContext } from 'react'

export interface ToastInput {
  message: string
  tone?: 'info' | 'error'
}

export const ToastContext = createContext<((toast: ToastInput) => void) | null>(null)

export function useToast(): (toast: ToastInput) => void {
  const push = useContext(ToastContext)
  if (!push) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return push
}
