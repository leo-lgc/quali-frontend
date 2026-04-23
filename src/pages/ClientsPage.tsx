import { Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ClientCard } from '../components/clients/ClientCard'
import { ClientFormFields } from '../components/clients/ClientFormFields'
import { useToast } from '../components/feedback/ToastProvider'
import { ConfirmActionModal } from '../components/modals/ConfirmActionModal'
import { ModalShell } from '../components/modals/ModalShell'
import { ApiError, apiRequest } from '../lib/api'
import { useAuth } from '../features/auth/AuthContext'

type Client = {
  id: number
  name: string
  email: string
  phone: string
}

type PageResponse<T> = {
  content: T[]
}

type ClientFormState = {
  name: string
  email: string
  phone: string
}

const initialForm: ClientFormState = {
  name: '',
  email: '',
  phone: '',
}

export function ClientsPage() {
  const { token } = useAuth()
  const toast = useToast()
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEditSubmitting, setIsEditSubmitting] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [error, setError] = useState('')
  const [modalError, setModalError] = useState('')
  const [form, setForm] = useState<ClientFormState>(initialForm)
  const [editForm, setEditForm] = useState<ClientFormState>(initialForm)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false)

  useEffect(() => {
    void loadClients()
  }, [token])

  async function loadClients() {
    setIsLoading(true)
    setError('')

    try {
      const response = await apiRequest<PageResponse<Client>>('/client', { token })
      setClients(response.content ?? [])
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Nao foi possivel carregar os clientes.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      await apiRequest('/client/register', {
        method: 'POST',
        token,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      })

      setForm(initialForm)
      toast.success('Cliente cadastrado com sucesso.')
      await loadClients()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Nao foi possivel cadastrar o cliente.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  function openEditModal(client: Client) {
    setSelectedClient(client)
    setEditForm({
      name: client.name,
      email: client.email,
      phone: client.phone,
    })
    setModalError('')
    setIsEditModalOpen(true)
  }

  function openArchiveModal(client: Client) {
    setSelectedClient(client)
    setModalError('')
    setIsArchiveModalOpen(true)
  }

  function closeClientModals() {
    setIsEditModalOpen(false)
    setIsArchiveModalOpen(false)
    setSelectedClient(null)
    setModalError('')
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedClient) return

    setIsEditSubmitting(true)
    setModalError('')

    try {
      await apiRequest('/client', {
        method: 'PATCH',
        token,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedClient.id,
          ...editForm,
        }),
      })

      closeClientModals()
      toast.success('Cliente atualizado com sucesso.')
      await loadClients()
    } catch (err) {
      if (err instanceof ApiError) {
        setModalError(err.message)
      } else {
        setModalError('Nao foi possivel atualizar o cliente.')
      }
    } finally {
      setIsEditSubmitting(false)
    }
  }

  async function handleArchiveClient() {
    if (!selectedClient) return

    setIsArchiving(true)
    setModalError('')

    try {
      await apiRequest(`/client/delete/soft/${selectedClient.id}`, {
        method: 'DELETE',
        token,
      })

      closeClientModals()
      toast.success('Cliente arquivado com sucesso.')
      await loadClients()
    } catch (err) {
      if (err instanceof ApiError) {
        setModalError(err.message)
      } else {
        setModalError('Nao foi possivel arquivar o cliente.')
      }
    } finally {
      setIsArchiving(false)
    }
  }

  function handleFormChange(field: keyof ClientFormState, value: string) {
    setForm((current) => ({
      ...current,
      [field]: handleClientFormValue(field, value),
    }))
  }

  function handleEditFormChange(field: keyof ClientFormState, value: string) {
    setEditForm((current) => ({
      ...current,
      [field]: handleClientFormValue(field, value),
    }))
  }

  const filteredClients = useMemo(() => {
    const term = search.trim().toLowerCase()

    if (!term) return clients

    return clients.filter((client) =>
      [client.name, client.email, client.phone].some((value) => value.toLowerCase().includes(term)),
    )
  }, [clients, search])

  return (
    <>
      <div className="page-stack">
        <section className="works-hero quali-works-hero clients-hero">
          <div>
            <p className="eyebrow">Base de clientes</p>
            <h2 className="section-title">Clientes</h2>
          </div>

          <div className="hero-mini-stats quali-mini-stats">
            <div className="hero-mini-stats__item">
              <strong>{clients.length}</strong>
              <span>Clientes</span>
            </div>
            <div className="hero-mini-stats__item">
              <strong>{filteredClients.length}</strong>
              <span>Visiveis</span>
            </div>
          </div>
        </section>

        <section className="detail-header-grid clients-layout-grid">
          <article className="work-overview-card work-overview-card--primary">
            <div className="panel__header clients-panel__header">
              <div>
                <h3 className="panel__title">Clientes cadastrados</h3>
                <p className="panel__copy">Edite ou arquive clientes.</p>
              </div>

              <div className="clients-toolbar__count">
                <strong>{filteredClients.length}</strong>
                <span>registros em tela</span>
              </div>
            </div>

            <label className="search-field search-field--board clients-search-field">
              <span className="sr-only">Buscar cliente</span>
              <span className="clients-search-field__icon" aria-hidden="true">
                <Search size={16} />
              </span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar cliente por nome, email ou telefone"
              />
            </label>
            {isLoading ? <p className="feedback">Carregando clientes...</p> : null}
            {!isLoading && error ? <p className="form-error">{error}</p> : null}

            {!isLoading && !error ? (
              <div className="clients-list">
                {filteredClients.length ? (
                  filteredClients.map((client) => (
                    <ClientCard key={client.id} client={client} onEdit={openEditModal} onArchive={openArchiveModal} />
                  ))
                ) : (
                  <p className="feedback">Nenhum cliente encontrado para o filtro atual.</p>
                )}
              </div>
            ) : null}
          </article>

          <article className="work-overview-card detail-side-actions">
            <div className="work-overview-card__header">
              <div>
                <h3>Novo cliente</h3>
                <p>Cadastro rapido.</p>
              </div>
            </div>

            <form className="auth-form clients-form" onSubmit={handleSubmit}>
              <div className="clients-form__intro">
                <strong>Novo cadastro</strong>
                <p>Preencha os dados principais.</p>
              </div>

              <ClientFormFields form={form} onChange={handleFormChange} />

              <button type="submit" className="primary-button clients-submit-button" disabled={isSubmitting}>
                <Plus size={18} />
                {isSubmitting ? 'Salvando...' : 'Cadastrar cliente'}
              </button>
            </form>
          </article>
        </section>
      </div>

      <ModalShell
        isOpen={isEditModalOpen}
        onClose={closeClientModals}
        eyebrow="Cliente"
        title="Editar cadastro"
        description="Atualize os dados."
        className="clients-modal"
      >
        <form className="clients-modal__form" onSubmit={handleEditSubmit}>
          <div className="clients-modal__grid">
            <ClientFormFields form={editForm} onChange={handleEditFormChange} />
          </div>

          {modalError ? <p className="form-error">{modalError}</p> : null}

          <div className="modal-card__actions">
            <button type="button" className="ghost-page-button" onClick={closeClientModals}>
              Cancelar
            </button>
            <button type="submit" className="primary-button" disabled={isEditSubmitting}>
              {isEditSubmitting ? 'Salvando...' : 'Salvar alteracoes'}
            </button>
          </div>
        </form>
      </ModalShell>

      <ConfirmActionModal
        isOpen={isArchiveModalOpen && !!selectedClient}
        onClose={closeClientModals}
        onConfirm={() => void handleArchiveClient()}
        eyebrow="Cliente"
        title="Arquivar cadastro"
        description="O cliente saira da lista principal."
        confirmLabel="Confirmar arquivamento"
        isSubmitting={isArchiving}
        error={modalError}
        summary={
          selectedClient ? (
            <>
              <strong>{selectedClient.name}</strong>
              <span>{selectedClient.email}</span>
              <span>{selectedClient.phone}</span>
            </>
          ) : null
        }
      />
    </>
  )
}

function handlePhoneChange(value: string) {
  return formatPhone(value)
}

function handleClientFormValue(field: keyof ClientFormState, value: string) {
  if (field === 'phone') return handlePhoneChange(value)
  return value
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)

  if (!digits) return ''
  if (digits.length <= 2) return `(${digits}`
  if (digits.length <= 3) return `(${digits.slice(0, 2)})${digits.slice(2)}`
  if (digits.length <= 7) return `(${digits.slice(0, 2)})${digits.slice(2, 3)} ${digits.slice(3)}`

  return `(${digits.slice(0, 2)})${digits.slice(2, 3)} ${digits.slice(3, 7)}-${digits.slice(7)}`
}
