import { X } from 'lucide-react'
import type { PropsWithChildren, ReactNode } from 'react'

type ModalShellProps = PropsWithChildren<{
  isOpen: boolean
  onClose: () => void
  eyebrow?: string
  title: string
  description?: string
  className?: string
  ariaLabel?: string
  headerContent?: ReactNode
  hideCloseButton?: boolean
}>

export function ModalShell({
  isOpen,
  onClose,
  eyebrow,
  title,
  description,
  className = '',
  ariaLabel,
  headerContent,
  hideCloseButton = false,
  children,
}: ModalShellProps) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <section
        className={`modal-card ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-card__header">
          <div>
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            <h2 className="section-title">{title}</h2>
            {description ? <p className="section-copy">{description}</p> : null}
          </div>

          {headerContent}

          {!hideCloseButton ? (
            <button type="button" className="icon-button" aria-label="Fechar modal" onClick={onClose}>
              <X size={18} />
            </button>
          ) : null}
        </div>

        {children}
      </section>
    </div>
  )
}
