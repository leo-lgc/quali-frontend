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
  className = '',
}: ConfirmActionModalProps) {
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      eyebrow={eyebrow}
      title={title}
      description={description}
      className={`confirm-action-modal ${className}`.trim()}
    >
      <div className="confirm-action-modal__summary">{summary}</div>

      {error ? <p className="form-error confirm-action-modal__error">{error}</p> : null}

      <div className="modal-card__actions confirm-action-modal__actions">
        <button type="button" className="ghost-page-button confirm-action-modal__button" onClick={onClose}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className="primary-button clients-danger-button confirm-action-modal__button"
          onClick={onConfirm}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Arquivando...' : confirmLabel}
        </button>
      </div>
    </ModalShell>
  )
}
