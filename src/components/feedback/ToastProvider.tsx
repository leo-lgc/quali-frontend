import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'

type ToastVariant = 'success' | 'error' | 'info'

type ToastItem = {
  id: number
  message: string
  variant: ToastVariant
}

type ToastContextValue = {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const TOAST_DURATION = 3500
const APP_TOAST_EVENT = 'quali:app-toast'

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const removeToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const addToast = useCallback((variant: ToastVariant, message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setToasts((current) => [...current, { id, variant, message }])
  }, [])

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (message) => addToast('success', message),
      error: (message) => addToast('error', message),
      info: (message) => addToast('info', message),
    }),
    [addToast],
  )

  useEffect(() => {
    function handleAppToast(event: Event) {
      const customEvent = event as CustomEvent<{ message?: string; variant?: ToastVariant }>
      addToast(customEvent.detail?.variant ?? 'info', customEvent.detail?.message ?? 'Sessão expirada. Faça login novamente.')
    }

    window.addEventListener(APP_TOAST_EVENT, handleAppToast)
    return () => window.removeEventListener(APP_TOAST_EVENT, handleAppToast)
  }, [addToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-viewport" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }

  return context
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      onDismiss(toast.id)
    }, TOAST_DURATION)

    return () => window.clearTimeout(timeoutId)
  }, [onDismiss, toast.id])

  return (
    <article className={`toast toast--${toast.variant}`} role="status">
      <div className="toast__icon" aria-hidden="true">
        {toast.variant === 'success' ? <CheckCircle2 size={18} /> : null}
        {toast.variant === 'error' ? <AlertCircle size={18} /> : null}
        {toast.variant === 'info' ? <Info size={18} /> : null}
      </div>

      <div className="toast__content">
        <strong className="toast__title">{getToastTitle(toast.variant)}</strong>
        <p className="toast__message">{toast.message}</p>
      </div>

      <button type="button" className="toast__close" aria-label="Fechar aviso" onClick={() => onDismiss(toast.id)}>
        <X size={16} />
      </button>
    </article>
  )
}

function getToastTitle(variant: ToastVariant) {
  if (variant === 'success') return 'Tudo certo'
  if (variant === 'error') return 'Algo deu errado'
  return 'Aviso'
}
