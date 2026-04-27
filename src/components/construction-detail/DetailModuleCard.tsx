import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

type DetailModuleAction = {
  label: string
  variant?: 'ghost' | 'secondary'
  onClick: () => void
}

type DetailModuleCardProps = {
  icon: LucideIcon
  title: string
  description: string
  metric: ReactNode
  actions: DetailModuleAction[]
}

export function DetailModuleCard({ icon: Icon, title, description, metric, actions }: DetailModuleCardProps) {
  return (
    <article className="module-card detail-module-card">
      <div className="module-card__top">
        <div className="module-card__icon">
          <Icon size={20} />
        </div>
      </div>
      <div className="module-card__content">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="module-card__metric">{metric}</div>
      <div className="module-card__actions">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            className={action.variant === 'secondary' ? 'secondary-page-button secondary-page-button--compact' : 'ghost-page-button'}
            onClick={action.onClick}
          >
            {action.label}
          </button>
        ))}
      </div>
    </article>
  )
}
