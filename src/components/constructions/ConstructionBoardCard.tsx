import { Archive, BriefcaseBusiness, Pencil } from 'lucide-react'
import { Link } from 'react-router-dom'

type ConstructionStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED'

type Construction = {
  id: number
  name: string
  status: ConstructionStatus
}

type ConstructionBoardCardProps = {
  item: Construction
  onEdit: (construction: Construction) => void | Promise<void>
  onArchive: (construction: Construction) => void
}

export function ConstructionBoardCard({ item, onEdit, onArchive }: ConstructionBoardCardProps) {
  return (
    <article className="board-card quali-board-card">
      <div className="board-card__top">
        <div className="board-card__icon">
          <BriefcaseBusiness size={18} />
        </div>
        <span className="board-card__badge">{buildBadgeText(item)}</span>
      </div>

      <div className="board-card__content">
        <h4>{item.name}</h4>
        <p>{buildDistrictText(item)}</p>
      </div>

      <div className="board-card__meta">
        <div className="board-card__meta-block">
          <span>Responsavel</span>
          <strong>{buildResponsibleText(item)}</strong>
        </div>
        <div className="board-card__meta-block">
          <span>Proximo marco</span>
          <strong>{buildMilestoneText(item)}</strong>
        </div>
      </div>

      <div className="board-card__footer">
        <span>{buildFooterText(item)}</span>
        <div className="board-card__footer-actions">
          <strong className="board-card__progress">{buildProgressText(item)}</strong>
          <Link to={`/obras/${item.id}`} className="secondary-page-button secondary-page-button--compact">
            Abrir obra
          </Link>
        </div>
      </div>

      <div className="board-card__management-actions">
        <button type="button" className="ghost-page-button secondary-page-button--compact" onClick={() => void onEdit(item)}>
          <Pencil size={15} />
          Editar
        </button>
        <button type="button" className="ghost-page-button secondary-page-button--compact" onClick={() => onArchive(item)}>
          <Archive size={15} />
          Arquivar
        </button>
      </div>
    </article>
  )
}

function buildBadgeText(item: Construction) {
  if (item.status === 'IN_PROGRESS') return 'Estrutura em execucao'
  if (item.status === 'SCHEDULED') return 'Mobilizacao inicial'
  return 'Entrega concluida'
}

function buildDistrictText(item: Construction) {
  if (item.status === 'IN_PROGRESS') return 'Bairro Centro'
  if (item.status === 'SCHEDULED') return 'Distrito Sul'
  return 'Distrito Industrial'
}

function buildResponsibleText(item: Construction) {
  if (item.status === 'IN_PROGRESS') return 'Mariana Souza'
  if (item.status === 'SCHEDULED') return 'Carlos Henrique'
  return 'Joao Pedro'
}

function buildMilestoneText(item: Construction) {
  if (item.status === 'IN_PROGRESS') return 'Concretagem em 29 Mar'
  if (item.status === 'SCHEDULED') return 'Inicio previsto em 08 Abr'
  return 'Encerrada em 12 Mar'
}

function buildFooterText(item: Construction) {
  if (item.status === 'IN_PROGRESS') return '2 etapas em atencao'
  if (item.status === 'SCHEDULED') return 'Aguardando liberacao do acesso'
  return 'Aguardando apenas arquivo final'
}

function buildProgressText(item: Construction) {
  if (item.status === 'IN_PROGRESS') return '72%'
  if (item.status === 'SCHEDULED') return '12%'
  return '100%'
}
