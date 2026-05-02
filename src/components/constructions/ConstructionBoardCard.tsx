import { Archive, BriefcaseBusiness, Ellipsis, Pencil, RotateCcw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

type ConstructionStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED'

type Construction = {
  id: number
  name: string
  status: ConstructionStatus
  clientName: string | null
  localContact: string | null
  endDate: string | null
  overdueDays: number | null
}

type ConstructionBoardCardProps = {
  item: Construction
  onEdit: (construction: Construction) => void | Promise<void>
  onArchive: (construction: Construction) => void
  onRetrieve?: (constructionId: number) => void
  canManage: boolean
}

const statusLabel: Record<ConstructionStatus, string> = {
  IN_PROGRESS: 'Em andamento',
  SCHEDULED: 'Aguardando início',
  COMPLETED: 'Finalizada',
}

export function ConstructionBoardCard({ item, onEdit, onArchive, onRetrieve, canManage }: ConstructionBoardCardProps) {
  const [isMenuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      window.addEventListener('pointerdown', handlePointerDown)
    }

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [isMenuOpen])

  return (
    <article className="board-card quali-board-card">
      <div className="board-card__top board-card__top--executive">
        <div className="board-card__icon">
          <BriefcaseBusiness size={18} />
        </div>
        <span className={`board-card__status-pill board-card__status-pill--${item.status.toLowerCase()}`}>
          {statusLabel[item.status]}
        </span>
      </div>

      <div className="board-card__content board-card__content--executive">
        <h4>{item.name}</h4>
        <p>{item.clientName?.trim() ? item.clientName : `Obra #${item.id}`}</p>
        <span className={item.overdueDays && item.overdueDays > 0 ? 'board-card__deadline board-card__deadline--late' : 'board-card__deadline'}>
          {buildDeadlineText(item)}
        </span>
      </div>

      <div className="board-card__executive-actions">
        <Link to={`/obras/${item.id}`} className="secondary-page-button secondary-page-button--compact">
          Abrir obra
        </Link>

        {canManage ? (
          <div className="board-card__menu" ref={menuRef}>
            <button
              type="button"
              className="ghost-page-button board-card__menu-trigger"
              onClick={() => setMenuOpen((current) => !current)}
              aria-label="Acoes da obra"
              aria-expanded={isMenuOpen}
            >
              <Ellipsis size={16} />
            </button>

            {isMenuOpen ? (
              <div className="board-card__menu-panel" role="menu" aria-label="Acoes da obra">
                <button
                  type="button"
                  className="board-card__menu-item"
                  onClick={() => {
                    setMenuOpen(false)
                    void onEdit(item)
                  }}
                >
                  <Pencil size={14} />
                  Editar
                </button>
                {onRetrieve ? (
                  <button
                    type="button"
                    className="board-card__menu-item"
                    onClick={() => {
                      setMenuOpen(false)
                      onRetrieve(item.id)
                    }}
                  >
                    <RotateCcw size={14} />
                    Recuperar
                  </button>
                ) : (
                  <button
                    type="button"
                    className="board-card__menu-item board-card__menu-item--danger"
                    onClick={() => {
                      setMenuOpen(false)
                      onArchive(item)
                    }}
                  >
                    <Archive size={14} />
                    Arquivar
                  </button>
                )}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  )
}

function buildDeadlineText(item: Construction) {
  if (item.overdueDays && item.overdueDays > 0) {
    return `${item.overdueDays} ${item.overdueDays === 1 ? 'dia de atraso' : 'dias de atraso'}`
  }

  if (item.endDate) {
    return `Prazo ${item.endDate}`
  }

  return item.localContact?.trim() ? `Contato ${item.localContact}` : 'Prazo não informado'
}
