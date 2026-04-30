import { Archive, Building2, Mail, Pencil, Phone } from 'lucide-react'

type Client = {
  id: number
  name: string
  email: string
  phone: string
}

type ClientCardProps = {
  client: Client
  onEdit: (client: Client) => void
  onArchive: (client: Client) => void
}

export function ClientCard({ client, onEdit, onArchive }: ClientCardProps) {
  return (
    <article className="client-card">
      <div className="client-card__top">
        <div className="client-card__identity">
          <div className="client-card__icon">
            <Building2 size={18} />
          </div>
          <span className="client-card__badge">Ativo</span>
        </div>

        <div className="client-card__actions">
          <button
            type="button"
            className="ghost-page-button secondary-page-button--compact"
            onClick={() => onEdit(client)}
            aria-label={`Editar cliente ${client.name}`}
          >
            <Pencil size={16} />
            Editar
          </button>
          <button
            type="button"
            className="ghost-page-button secondary-page-button--compact"
            onClick={() => onArchive(client)}
            aria-label={`Arquivar cliente ${client.name}`}
          >
            <Archive size={16} />
            Arquivar
          </button>
        </div>
      </div>

      <div className="client-card__content">
        <h3>{client.name}</h3>
        <p>Contato disponível.</p>
      </div>

      <div className="client-card__meta">
        <div>
          <span>Email</span>
          <a className="client-card__value-link" href={`mailto:${client.email}`}>
            <Mail size={14} /> {client.email}
          </a>
        </div>
        <div>
          <span>Telefone</span>
          <a className="client-card__value-link" href={`tel:${client.phone.replace(/\D/g, '')}`}>
            <Phone size={14} /> {client.phone}
          </a>
        </div>
      </div>
    </article>
  )
}
