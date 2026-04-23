import { Plus } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ConstructionAddressFields } from '../components/constructions/ConstructionAddressFields'
import { ConstructionBoardCard } from '../components/constructions/ConstructionBoardCard'
import { ConstructionDetailsFields } from '../components/constructions/ConstructionDetailsFields'
import { useToast } from '../components/feedback/ToastProvider'
import { ConfirmActionModal } from '../components/modals/ConfirmActionModal'
import { ModalShell } from '../components/modals/ModalShell'
import { ApiError, apiRequest } from '../lib/api'
import { useAuth } from '../features/auth/AuthContext'

type ConstructionStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED'

type Construction = {
  id: number
  name: string
  status: ConstructionStatus
}

type Client = {
  name: string
  email: string
  phone: string
}

type ClientOption = Client & {
  id: number
}

type ReportResponse = {
  id: number
  name: string
  localContact: string
  client: {
    name: string
    phone: string
    email: string
  }
  address: {
    cep: string
    city: string
    street: string
    neighborhood: string
    number: number
    complement: string | null
  }
  workers: Array<{
    id: number
    email: string
  }>
  startDate: string
  endDate: string
  agreedDeadLine: number
  daysElapsed: number
  overdueDays: number
  isCorrective: boolean
  status: ConstructionStatus
  weather: string | null
  comments: string | null
  pictures: Array<{
    url: string
  }>
}

type PageResponse<T> = {
  content: T[]
  number: number
  totalPages: number
  totalElements: number
}

type ConstructionFormState = {
  name: string
  localContact: string
  clientId: string
  startDate: string
  endDate: string
  agreedDeadLine: string
  comments: string
  cep: string
  city: string
  street: string
  neighborhood: string
  number: string
  complement: string
}

type ModalStep = 'details' | 'address'
type WorkModalMode = 'create' | 'edit'

const initialForm: ConstructionFormState = {
  name: '',
  localContact: '',
  clientId: '',
  startDate: '',
  endDate: '',
  agreedDeadLine: '',
  comments: '',
  cep: '',
  city: '',
  street: '',
  neighborhood: '',
  number: '',
  complement: '',
}

const statusLabel: Record<ConstructionStatus, string> = {
  SCHEDULED: 'Aguardando inicio',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Finalizada',
}

const statusDescription: Record<ConstructionStatus, string> = {
  IN_PROGRESS: 'Em execucao.',
  SCHEDULED: 'Prontas para iniciar.',
  COMPLETED: 'Ja concluidas.',
}

const statusAccentClass: Record<ConstructionStatus, string> = {
  IN_PROGRESS: 'board-column--em-andamento',
  SCHEDULED: 'board-column--aguardando-inicio',
  COMPLETED: 'board-column--finalizada',
}

export function ConstructionsPage() {
  const { token } = useAuth()
  const toast = useToast()
  const [items, setItems] = useState<Construction[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [isFetchingCep, setIsFetchingCep] = useState(false)
  const [isEditingLoading, setIsEditingLoading] = useState(false)
  const [modalMode, setModalMode] = useState<WorkModalMode>('create')
  const [modalStep, setModalStep] = useState<ModalStep>('details')
  const [selectedConstruction, setSelectedConstruction] = useState<Construction | null>(null)
  const [selectedWorkersIds, setSelectedWorkersIds] = useState<number[]>([])
  const [error, setError] = useState('')
  const [modalError, setModalError] = useState('')
  const [cepError, setCepError] = useState('')
  const [form, setForm] = useState<ConstructionFormState>(initialForm)

  useEffect(() => {
    void loadInitialData()
  }, [token])

  async function loadInitialData() {
    setIsLoading(true)
    setError('')

    try {
      const [constructionsResponse, clientsResponse] = await Promise.all([
        apiRequest<PageResponse<Construction>>('/construction', { token }),
        apiRequest<PageResponse<ClientOption>>('/client', { token }),
      ])

      setItems(constructionsResponse.content ?? [])
      setClients(clientsResponse.content ?? [])
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Nao foi possivel carregar as obras.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  function openCreateModal() {
    setModalMode('create')
    setSelectedConstruction(null)
    setSelectedWorkersIds([])
    setForm(initialForm)
    setModalStep('details')
    setModalError('')
    setCepError('')
    setIsModalOpen(true)
  }

  async function openEditModal(construction: Construction) {
    setModalMode('edit')
    setSelectedConstruction(construction)
    setSelectedWorkersIds([])
    setModalStep('details')
    setModalError('')
    setCepError('')
    setIsEditingLoading(true)
    setIsModalOpen(true)

    try {
      const report = await apiRequest<ReportResponse>(`/construction/report/${construction.id}`, { token })
      const clientOption = clients.find((client) => client.email === report.client?.email)

      setSelectedWorkersIds((report.workers ?? []).map((worker) => worker.id))
      setForm({
        name: report.name ?? '',
        localContact: report.localContact ?? '',
        clientId: clientOption ? String(clientOption.id) : '',
        startDate: formatInputDate(report.startDate),
        endDate: formatInputDate(report.endDate),
        agreedDeadLine: String(report.agreedDeadLine ?? ''),
        comments: report.comments ?? '',
        cep: report.address?.cep ?? '',
        city: report.address?.city ?? '',
        street: report.address?.street ?? '',
        neighborhood: report.address?.neighborhood ?? '',
        number: report.address?.number ? String(report.address.number) : '',
        complement: report.address?.complement ?? '',
      })
    } catch (err) {
      if (err instanceof ApiError) {
        setModalError(err.message)
      } else {
        setModalError('Nao foi possivel carregar os dados da obra para edicao.')
      }
    } finally {
      setIsEditingLoading(false)
    }
  }

  function openArchiveModal(construction: Construction) {
    setSelectedConstruction(construction)
    setModalError('')
    setIsArchiveModalOpen(true)
  }

  function closeWorkModals() {
    setIsModalOpen(false)
    setIsArchiveModalOpen(false)
    setIsEditingLoading(false)
    setSelectedConstruction(null)
    setSelectedWorkersIds([])
    setModalStep('details')
    setModalError('')
    setCepError('')
    setForm(initialForm)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setModalError('')

    const payload = {
      name: form.name,
      localContact: form.localContact,
      clientId: Number(form.clientId),
      address: {
        cep: form.cep,
        city: form.city,
        street: form.street,
        neighborhood: form.neighborhood,
        number: Number(form.number),
        complement: form.complement || null,
      },
      workersIds: selectedWorkersIds,
      startDate: formatApiDate(form.startDate),
      endDate: formatApiDate(form.endDate),
      agreedDeadLine: Number(form.agreedDeadLine),
    }

    try {
      if (modalMode === 'create') {
        await apiRequest('/construction/register', {
          method: 'POST',
          token,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...payload,
            comments: form.comments,
          }),
        })

        toast.success('Obra cadastrada com sucesso.')
      } else if (selectedConstruction) {
        await apiRequest('/construction/update', {
          method: 'PATCH',
          token,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: selectedConstruction.id,
            ...payload,
            coments: form.comments,
          }),
        })

        toast.success('Obra atualizada com sucesso.')
      }

      closeWorkModals()
      await loadInitialData()
    } catch (err) {
      if (err instanceof ApiError) {
        setModalError(err.message)
      } else {
        setModalError(modalMode === 'create' ? 'Nao foi possivel cadastrar a obra.' : 'Nao foi possivel atualizar a obra.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleArchiveConstruction() {
    if (!selectedConstruction) return

    setIsArchiving(true)
    setModalError('')

    try {
      await apiRequest(`/construction/delete/${selectedConstruction.id}`, {
        method: 'DELETE',
        token,
      })

      closeWorkModals()
      toast.success('Obra arquivada com sucesso.')
      await loadInitialData()
    } catch (err) {
      if (err instanceof ApiError) {
        setModalError(err.message)
      } else {
        setModalError('Nao foi possivel arquivar a obra.')
      }
    } finally {
      setIsArchiving(false)
    }
  }

  async function handleCepChange(value: string) {
    const normalizedCep = value.replace(/\D/g, '').slice(0, 8)

    setForm((current) => ({ ...current, cep: formatCep(normalizedCep) }))
    setCepError('')

    if (normalizedCep.length !== 8) {
      return
    }

    setIsFetchingCep(true)

    try {
      const response = await fetch(`https://viacep.com.br/ws/${normalizedCep}/json/`)
      const data = (await response.json()) as {
        erro?: boolean
        localidade?: string
        logradouro?: string
        bairro?: string
        complemento?: string
      }

      if (data.erro) {
        setCepError('CEP nao encontrado.')
        return
      }

      setForm((current) => ({
        ...current,
        cep: formatCep(normalizedCep),
        city: data.localidade ?? current.city,
        street: data.logradouro ?? current.street,
        neighborhood: data.bairro ?? current.neighborhood,
        complement: data.complemento || current.complement,
      }))
    } catch {
      setCepError('Nao foi possivel buscar o CEP agora.')
    } finally {
      setIsFetchingCep(false)
    }
  }

  function handleFormChange(field: keyof ConstructionFormState, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase()

    if (!term) return items

    return items.filter((item) => item.name.toLowerCase().includes(term))
  }, [items, search])

  const totals = useMemo(
    () => ({
      all: items.length,
      scheduled: items.filter((item) => item.status === 'SCHEDULED').length,
      inProgress: items.filter((item) => item.status === 'IN_PROGRESS').length,
      completed: items.filter((item) => item.status === 'COMPLETED').length,
    }),
    [items],
  )

  const groupedItems = useMemo(
    () => [
      { status: 'IN_PROGRESS' as const, items: filteredItems.filter((item) => item.status === 'IN_PROGRESS') },
      { status: 'SCHEDULED' as const, items: filteredItems.filter((item) => item.status === 'SCHEDULED') },
      { status: 'COMPLETED' as const, items: filteredItems.filter((item) => item.status === 'COMPLETED') },
    ],
    [filteredItems],
  )

  return (
    <>
      <div className="page-stack">
        <section className="works-hero works-hero--board quali-works-hero">
          <div>
            <p className="eyebrow">Hoje, {formatLongDate()}</p>
            <h2 className="section-title">Obras</h2>
          </div>

          <div className="works-hero__actions quali-works-actions">
            <div className="hero-mini-stats quali-mini-stats">
              <div className="hero-mini-stats__item">
                <strong>{totals.inProgress}</strong>
                <span>Em andamento</span>
              </div>
              <div className="hero-mini-stats__item">
                <strong>{totals.scheduled}</strong>
                <span>Aguardando</span>
              </div>
              <div className="hero-mini-stats__item">
                <strong>{totals.completed}</strong>
                <span>Finalizadas</span>
              </div>
            </div>

            <button type="button" className="primary-button works-hero__button" onClick={openCreateModal}>
              <Plus size={18} />
              Nova obra
            </button>
          </div>
        </section>

        <label className="search-field search-field--board search-field--works-page">
          <span className="sr-only">Buscar obra</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar obra por nome"
          />
        </label>
        {isLoading ? <p className="feedback">Carregando obras...</p> : null}
        {!isLoading && error ? <p className="form-error">{error}</p> : null}

        {!isLoading && !error ? (
          <section className="works-board quali-works-board">
            {groupedItems.map((group) => (
              <article key={group.status} className={`board-column ${statusAccentClass[group.status]} quali-board-column`}>
                <div className="board-column__header">
                  <div>
                    <span className="panel__eyebrow">{statusLabel[group.status]}</span>
                    <h3>{group.items.length} obras</h3>
                    <p>{statusDescription[group.status]}</p>
                  </div>
                </div>

                <div className="board-column__list">
                  {group.items.length ? (
                    group.items.map((item) => (
                      <ConstructionBoardCard key={item.id} item={item} onEdit={openEditModal} onArchive={openArchiveModal} />
                    ))
                  ) : (
                    <p className="feedback">Nenhuma obra nesta coluna para o filtro atual.</p>
                  )}
                </div>
              </article>
            ))}
          </section>
        ) : null}
      </div>

      <ModalShell
        isOpen={isModalOpen}
        onClose={closeWorkModals}
        eyebrow={modalMode === 'create' ? 'Nova obra' : 'Obra'}
        title={modalMode === 'create' ? 'Cadastrar obra' : 'Editar obra'}
        description={modalMode === 'create' ? 'Preencha os dados da obra.' : 'Atualize os dados da obra.'}
        className="works-modal"
      >
        {isEditingLoading ? (
          <p className="feedback">Carregando dados da obra...</p>
        ) : (
          <form className="works-form" onSubmit={handleSubmit}>
            <div className="stepper">
              <div className={modalStep === 'details' ? 'stepper__item stepper__item--active' : 'stepper__item'}>
                <span>1</span>
                <strong>Dados principais</strong>
              </div>
              <div className={modalStep === 'address' ? 'stepper__item stepper__item--active' : 'stepper__item'}>
                <span>2</span>
                <strong>Endereco e observacoes</strong>
              </div>
            </div>

            <div className="works-form__body">
              {modalStep === 'details' ? (
                <section className="modal-section modal-section--fill">
                  <div className="modal-section__header">
                    <span className="panel__eyebrow">Dados principais</span>
                    <p className="panel__copy">Dados da obra.</p>
                  </div>

                  <ConstructionDetailsFields form={form} clients={clients} onChange={handleFormChange} />
                </section>
              ) : (
                <div className="works-form__stack">
                  <ConstructionAddressFields form={form} isFetchingCep={isFetchingCep} cepError={cepError} onChange={handleFormChange} onCepChange={(value) => void handleCepChange(value)} />
                </div>
              )}
            </div>

            {modalError ? <p className="form-error">{modalError}</p> : null}

            <div className="modal-card__actions">
              <button type="button" className="ghost-page-button" onClick={() => modalStep === 'details' ? closeWorkModals() : setModalStep('details')}>
                {modalStep === 'details' ? 'Cancelar' : 'Voltar'}
              </button>

              {modalStep === 'details' ? (
                <button type="button" className="primary-button" onClick={() => setModalStep('address')}>
                  Continuar
                </button>
              ) : (
                <button type="submit" className="primary-button" disabled={isSubmitting || isFetchingCep}>
                  {isSubmitting ? 'Salvando...' : modalMode === 'create' ? 'Cadastrar obra' : 'Salvar alteracoes'}
                </button>
              )}
            </div>
          </form>
        )}
      </ModalShell>

      <ConfirmActionModal
        isOpen={isArchiveModalOpen && !!selectedConstruction}
        onClose={closeWorkModals}
        onConfirm={() => void handleArchiveConstruction()}
        eyebrow="Obra"
        title="Arquivar obra"
        description="A obra saira da lista principal."
        confirmLabel="Confirmar arquivamento"
        isSubmitting={isArchiving}
        error={modalError}
        summary={
          selectedConstruction ? (
            <>
              <strong>{selectedConstruction.name}</strong>
              <span>{statusLabel[selectedConstruction.status]}</span>
              <span>Historico mantido.</span>
            </>
          ) : null
        }
      />
    </>
  )
}

function formatLongDate() {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date())
}

function formatApiDate(value: string) {
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

function formatInputDate(value: string) {
  const [day, month, year] = value.split('/')
  if (!day || !month || !year) return ''
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

function formatCep(value: string) {
  const normalized = value.replace(/\D/g, '')
  if (normalized.length <= 5) return normalized
  return `${normalized.slice(0, 5)}-${normalized.slice(5, 8)}`
}
