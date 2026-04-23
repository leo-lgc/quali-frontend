import type { ReactNode } from 'react'
import { ModalShell } from './ModalShell'

type ConfirmActionModalProps = {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  eyebrow: string
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  isSubmitting?: boolean
  error?: string
  summary: ReactNode
  className?: string
}

export function ConfirmActionModal({
  isOpen,
  onClose,
  onConfirm,
  eyebrow,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Voltar',
  isSubmitting = false,
  error,
  summary,
  className = 'clients-modal clients-modal--danger',
}: ConfirmActionModalProps) {
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      eyebrow={eyebrow}
      title={title}
      description={description}
      className={className}
    >
      <div className="clients-archive-box">{summary}</div>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="modal-card__actions">
        <button type="button" className="ghost-page-button" onClick={onClose}>
          {cancelLabel}
        </button>
        <button type="button" className="primary-button clients-danger-button" onClick={onConfirm} disabled={isSubmitting}>
          {isSubmitting ? 'Arquivando...' : confirmLabel}
        </button>
      </div>
    </ModalShell>
  )
}
