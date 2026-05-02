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
type BoardFilter = 'ALL' | ConstructionStatus
type ConstructionScope = 'ACTIVE' | 'ARCHIVED'

type ConstructionColumnState = {
  items: Construction[]
  page: number
  totalPages: number
  totalElements: number
  isLoading: boolean
  error: string
}

type Construction = {
  id: number
  name: string
  status: ConstructionStatus
  clientName: string | null
  localContact: string | null
  endDate: string | null
  overdueDays: number | null
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
  SCHEDULED: 'Aguardando início',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Finalizada',
}

const statusDescription: Record<ConstructionStatus, string> = {
  IN_PROGRESS: 'Em execução.',
  SCHEDULED: 'Prontas para iniciar.',
  COMPLETED: 'Já concluídas.',
}

const statusAccentClass: Record<ConstructionStatus, string> = {
  IN_PROGRESS: 'board-column--em-andamento',
  SCHEDULED: 'board-column--aguardando-inicio',
  COMPLETED: 'board-column--finalizada',
}

const boardStatuses: ConstructionStatus[] = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED']
const boardPageSize = 8

const initialColumnState: ConstructionColumnState = {
  items: [],
  page: -1,
  totalPages: 0,
  totalElements: 0,
  isLoading: false,
  error: '',
}

const initialColumnsState: Record<ConstructionStatus, ConstructionColumnState> = {
  IN_PROGRESS: { ...initialColumnState },
  SCHEDULED: { ...initialColumnState },
  COMPLETED: { ...initialColumnState },
}

export function ConstructionsPage() {
  const { token, user } = useAuth()
  const toast = useToast()
  const canManageConstruction = user?.role === 'ADMIN' || user?.role === 'MANAGER'
  const [columns, setColumns] = useState<Record<ConstructionStatus, ConstructionColumnState>>(initialColumnsState)
  const [clients, setClients] = useState<ClientOption[]>([])
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [boardFilter, setBoardFilter] = useState<BoardFilter>('ALL')
  const [scope, setScope] = useState<ConstructionScope>('ACTIVE')
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
  const [clientFieldError, setClientFieldError] = useState('')
  const [nameFieldError, setNameFieldError] = useState('')
  const [localContactFieldError, setLocalContactFieldError] = useState('')
  const [startDateFieldError, setStartDateFieldError] = useState('')
  const [endDateFieldError, setEndDateFieldError] = useState('')
  const [cepError, setCepError] = useState('')
  const [form, setForm] = useState<ConstructionFormState>(initialForm)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, 320)

    return () => window.clearTimeout(timeoutId)
  }, [search])

  useEffect(() => {
    if (!canManageConstruction) {
      setClients([])
      return
    }

    void loadClients()
  }, [token, canManageConstruction])

  useEffect(() => {
    void loadBoardData(debouncedSearch)
  }, [token, debouncedSearch, scope])

  async function loadClients() {
    try {
      const clientsResponse = await apiRequest<PageResponse<ClientOption>>('/client', { token })
      setClients(clientsResponse.content ?? [])
    } catch {
      setClients([])
    }
  }

  async function loadBoardData(searchQuery: string) {
    setIsLoading(true)
    setError('')

    try {
      if (scope === 'ARCHIVED') {
        const archivedResponse = await apiRequest<PageResponse<Construction>>(`/construction/filter/deleted?page=0&size=60`, { token })
        const archivedItems = archivedResponse.content ?? []

        const nextColumns: Record<ConstructionStatus, ConstructionColumnState> = {
          IN_PROGRESS: { ...initialColumnState },
          SCHEDULED: { ...initialColumnState },
          COMPLETED: { ...initialColumnState },
        }

        for (const status of boardStatuses) {
          const filtered = archivedItems.filter((item) => item.status === status)
          nextColumns[status] = {
            items: filtered,
            page: 0,
            totalPages: 1,
            totalElements: filtered.length,
            isLoading: false,
            error: '',
          }
        }

        setColumns(nextColumns)
        return
      }

      const columnResponses = await Promise.all(
        boardStatuses.map((status) =>
          apiRequest<PageResponse<Construction>>(buildStatusFilterUrl(status, 0, boardPageSize, searchQuery), { token }),
        ),
      )

      const nextColumns: Record<ConstructionStatus, ConstructionColumnState> = {
        IN_PROGRESS: { ...initialColumnState },
        SCHEDULED: { ...initialColumnState },
        COMPLETED: { ...initialColumnState },
      }

      for (let index = 0; index < boardStatuses.length; index += 1) {
        const status = boardStatuses[index]
        const response = columnResponses[index]

        nextColumns[status] = {
          items: response.content ?? [],
          page: response.number,
          totalPages: response.totalPages,
          totalElements: response.totalElements,
          isLoading: false,
          error: '',
        }
      }

      setColumns(nextColumns)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Não foi possível carregar as obras.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function loadMoreByStatus(status: ConstructionStatus) {
    const column = columns[status]

    if (column.isLoading || column.page + 1 >= column.totalPages) {
      return
    }

    const nextPage = column.page + 1

    setColumns((current) => ({
      ...current,
      [status]: {
        ...current[status],
        isLoading: true,
        error: '',
      },
    }))

    try {
      const response = await apiRequest<PageResponse<Construction>>(
        buildStatusFilterUrl(status, nextPage, boardPageSize, debouncedSearch),
        { token },
      )

      setColumns((current) => ({
        ...current,
        [status]: {
          ...current[status],
          items: [...current[status].items, ...(response.content ?? [])],
          page: response.number,
          totalPages: response.totalPages,
          totalElements: response.totalElements,
          isLoading: false,
          error: '',
        },
      }))
    } catch (err) {
      setColumns((current) => ({
        ...current,
        [status]: {
          ...current[status],
          isLoading: false,
          error: err instanceof ApiError ? err.message : 'Não foi possível carregar mais obras.',
        },
      }))
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
    setNameFieldError('')
    setLocalContactFieldError('')
    setStartDateFieldError('')
    setEndDateFieldError('')
    setIsModalOpen(true)
  }

  async function openEditModal(construction: Construction) {
    setModalMode('edit')
    setSelectedConstruction(construction)
    setSelectedWorkersIds([])
    setModalStep('details')
    setModalError('')
    setCepError('')
    setNameFieldError('')
    setLocalContactFieldError('')
    setStartDateFieldError('')
    setEndDateFieldError('')
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
        setModalError('Não foi possível carregar os dados da obra para edição.')
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
    setClientFieldError('')
    setNameFieldError('')
    setLocalContactFieldError('')
    setStartDateFieldError('')
    setEndDateFieldError('')
    setCepError('')
    setForm(initialForm)
  }

  function handleContinueToAddress() {
    if (!form.clientId) {
      setClientFieldError('Selecione um cliente para continuar.')
      setModalError('')
      return
    }

    setClientFieldError('')
    setNameFieldError('')
    setLocalContactFieldError('')
    setStartDateFieldError('')
    setEndDateFieldError('')

    if (!hasLetters(form.name)) {
      setNameFieldError('Informe um nome de obra válido (não use apenas números).')
      setModalStep('details')
      setIsSubmitting(false)
      return
    }

    if (!hasLetters(form.localContact)) {
      setLocalContactFieldError('Informe um contato local válido (não use apenas números).')
      setModalStep('details')
      setIsSubmitting(false)
      return
    }

    if (!isCompleteDate(form.startDate)) {
      setStartDateFieldError('Informe a data de início no formato dd/mm/aaaa.')
      setModalStep('details')
      setIsSubmitting(false)
      return
    }

    if (!isCompleteDate(form.endDate)) {
      setEndDateFieldError('Informe a data de fim no formato dd/mm/aaaa.')
      setModalStep('details')
      setIsSubmitting(false)
      return
    }
    setModalStep('address')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setModalError('')
    setClientFieldError('')

    if (!form.clientId) {
      setIsSubmitting(false)
      setClientFieldError('Selecione um cliente para continuar.')
      setModalStep('details')
      return
    }

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
      await loadBoardData(debouncedSearch)
    } catch (err) {
      if (err instanceof ApiError) {
        setModalError(err.message)
      } else {
        setModalError(modalMode === 'create' ? 'Não foi possível cadastrar a obra.' : 'Não foi possível atualizar a obra.')
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
      await apiRequest(`/construction/soft/${selectedConstruction.id}`, {
        method: 'DELETE',
        token,
      })

      closeWorkModals()
      toast.success('Obra arquivada com sucesso.')
      await loadBoardData(debouncedSearch)
    } catch (err) {
      if (err instanceof ApiError) {
        setModalError(err.message)
      } else {
        setModalError('Não foi possível arquivar a obra.')
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
        setCepError('CEP não encontrado.')
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
      setCepError('Não foi possível buscar o CEP agora.')
    } finally {
      setIsFetchingCep(false)
    }
  }

  function handleFormChange(field: keyof ConstructionFormState, value: string) {
    if (field === 'clientId') {
      setClientFieldError('')
    }
    if (field === 'name') setNameFieldError('')
    if (field === 'localContact') setLocalContactFieldError('')
    if (field === 'startDate') setStartDateFieldError('')
    if (field === 'endDate') setEndDateFieldError('')

    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  async function handleRetrieveConstruction(constructionId: number) {
    try {
      await apiRequest(`/construction/retrieve/${constructionId}`, {
        method: 'PATCH',
        token,
      })
      toast.success('Obra recuperada com sucesso.')
      await loadBoardData(debouncedSearch)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Não foi possível recuperar a obra.')
      }
    }
  }

  const groupedItems = useMemo(() => {
    return boardStatuses.map((status) => {
      const column = columns[status]

      return {
        status,
        items: column.items,
        totalElements: column.totalElements,
        hasMore: column.page + 1 < column.totalPages,
        isLoading: column.isLoading,
        error: column.error,
      }
    })
  }, [columns])

  const totals = useMemo(
    () => ({
      all: columns.IN_PROGRESS.totalElements + columns.SCHEDULED.totalElements + columns.COMPLETED.totalElements,
      scheduled: columns.SCHEDULED.totalElements,
      inProgress: columns.IN_PROGRESS.totalElements,
      completed: columns.COMPLETED.totalElements,
    }),
    [columns],
  )

  const visibleGroups = useMemo(
    () => (boardFilter === 'ALL' ? groupedItems : groupedItems.filter((group) => group.status === boardFilter)),
    [groupedItems, boardFilter],
  )

  return (
    <>
      <div className="page-stack">
        <section className="works-hero works-hero--board quali-works-hero">
          <div>
            <p className="eyebrow">Hoje, {formatLongDate()}</p>
            <h2 className="section-title">Obras</h2>
          </div>

          <div className="works-hero__actions works-hero__actions--board quali-works-actions">
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

            {user?.role !== 'USER' ? (
              <button type="button" className="primary-button works-hero__button" onClick={openCreateModal}>
                <Plus size={18} />
                Nova obra
              </button>
            ) : null}
          </div>
        </section>

        <section className="works-board-shell">
          <div className="works-board-toolbar">
            <label className="search-field search-field--board search-field--works-page">
              <span className="sr-only">Buscar obra</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar obra por nome"
              />
            </label>

            <div className="works-board-toolbar__filters" role="tablist" aria-label="Filtrar colunas do board">
              <button
                type="button"
                className={boardFilter === 'ALL' ? 'board-filter-pill board-filter-pill--active' : 'board-filter-pill'}
                onClick={() => setBoardFilter('ALL')}
              >
                Todas
              </button>
              <button
                type="button"
                className={boardFilter === 'IN_PROGRESS' ? 'board-filter-pill board-filter-pill--active' : 'board-filter-pill'}
                onClick={() => setBoardFilter('IN_PROGRESS')}
              >
                Em andamento
              </button>
              <button
                type="button"
                className={boardFilter === 'SCHEDULED' ? 'board-filter-pill board-filter-pill--active' : 'board-filter-pill'}
                onClick={() => setBoardFilter('SCHEDULED')}
              >
                Aguardando
              </button>
              <button
                type="button"
                className={boardFilter === 'COMPLETED' ? 'board-filter-pill board-filter-pill--active' : 'board-filter-pill'}
                onClick={() => setBoardFilter('COMPLETED')}
              >
                Finalizadas
              </button>
              {canManageConstruction ? (
                <>
                  <button
                    type="button"
                    className={scope === 'ACTIVE' ? 'board-filter-pill board-filter-pill--active' : 'board-filter-pill'}
                    onClick={() => setScope('ACTIVE')}
                  >
                    Ativas
                  </button>
                  <button
                    type="button"
                    className={scope === 'ARCHIVED' ? 'board-filter-pill board-filter-pill--active' : 'board-filter-pill'}
                    onClick={() => setScope('ARCHIVED')}
                  >
                    Arquivadas
                  </button>
                </>
              ) : null}
            </div>
          </div>

          {isLoading ? <p className="feedback">Carregando obras...</p> : null}
          {!isLoading && error ? <p className="form-error">{error}</p> : null}

          {!isLoading && !error ? (
            <section className="works-board quali-works-board">
              {visibleGroups.map((group) => (
                <article key={group.status} className={`board-column ${statusAccentClass[group.status]} quali-board-column`}>
                  <div className="board-column__header">
                    <div>
                      <span className="panel__eyebrow">{statusLabel[group.status]}</span>
                      <h3>{group.totalElements} obras</h3>
                      <p>{statusDescription[group.status]}</p>
                    </div>
                  </div>

                  <div className="board-column__list">
                    {group.items.length ? (
                        group.items.map((item) => (
                          <ConstructionBoardCard
                            key={item.id}
                            item={item}
                            onEdit={openEditModal}
                            onArchive={openArchiveModal}
                            onRetrieve={scope === 'ARCHIVED' ? handleRetrieveConstruction : undefined}
                            canManage={canManageConstruction}
                          />
                        ))
                    ) : (
                      <p className="feedback">Nenhuma obra nesta coluna para o filtro atual.</p>
                    )}
                  </div>

                  {group.error ? <p className="form-error board-column__error">{group.error}</p> : null}

                  {group.hasMore && scope === 'ACTIVE' ? (
                    <div className="board-column__footer">
                      <button
                        type="button"
                        className="ghost-page-button board-column__load-more"
                        onClick={() => void loadMoreByStatus(group.status)}
                        disabled={group.isLoading}
                      >
                        {group.isLoading ? 'Carregando...' : 'Carregar mais'}
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </section>
          ) : null}
        </section>
      </div>

      <ModalShell
        isOpen={isModalOpen}
        onClose={closeWorkModals}
        eyebrow={modalMode === 'create' ? 'Nova obra' : 'Obra'}
        title={modalMode === 'create' ? 'Cadastrar obra' : 'Editar obra'}
        description={modalMode === 'create' ? 'Preencha os dados da obra.' : 'Atualize os dados da obra.'}
        className={modalMode === 'edit' ? 'works-modal modal-card--edit' : 'works-modal'}
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
                <strong>Endereço e observações</strong>
              </div>
            </div>

            <div className="works-form__body">
              {modalStep === 'details' ? (
                <section className="modal-section modal-section--fill">
                  <div className="modal-section__header">
                    <span className="panel__eyebrow">Dados principais</span>
                    <p className="panel__copy">Dados da obra.</p>
                  </div>

                  <ConstructionDetailsFields
                    form={form}
                    clients={clients}
                    clientError={clientFieldError}
                    nameError={nameFieldError}
                    localContactError={localContactFieldError}
                    startDateError={startDateFieldError}
                    endDateError={endDateFieldError}
                    onChange={handleFormChange}
                  />
                </section>
              ) : (
                <div className="works-form__stack">
                  <ConstructionAddressFields form={form} isFetchingCep={isFetchingCep} cepError={cepError} onChange={handleFormChange} onCepChange={(value) => void handleCepChange(value)} />
                </div>
              )}
            </div>

            {modalError ? <div className="works-form__feedback"><p className="form-error">{modalError}</p></div> : null}

            <div className="modal-card__actions works-form__actions">
              <button type="button" className="ghost-page-button" onClick={() => modalStep === 'details' ? closeWorkModals() : setModalStep('details')}>
                {modalStep === 'details' ? 'Cancelar' : 'Voltar'}
              </button>

              {modalStep === 'details' ? (
                <button type="button" className="primary-button" onClick={handleContinueToAddress}>
                  Continuar
                </button>
              ) : (
                <button type="submit" className="primary-button" disabled={isSubmitting || isFetchingCep}>
                  {isSubmitting ? 'Salvando...' : modalMode === 'create' ? 'Cadastrar obra' : 'Salvar alterações'}
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
        description="A obra sairá da lista principal."
        confirmLabel="Confirmar arquivamento"
        isSubmitting={isArchiving}
        error={modalError}
        summary={
          selectedConstruction ? (
            <>
              <strong>{selectedConstruction.name}</strong>
              <span>{statusLabel[selectedConstruction.status]}</span>
              <span>Histórico mantido.</span>
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

function buildStatusFilterUrl(status: ConstructionStatus, page: number, size: number, search: string) {
  const normalizedSearch = search.trim()
  const basePath = normalizedSearch
    ? `/construction/filter/status/${status}/search`
    : `/construction/filter/status/${status}`

  if (!normalizedSearch) {
    return `${basePath}?page=${page}&size=${size}`
  }

  return `${basePath}?page=${page}&size=${size}&query=${encodeURIComponent(normalizedSearch)}`
}

function formatApiDate(value: string) {
  const normalized = value?.trim()
  if (!normalized) return ''

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(normalized)) {
    return normalized
  }

  const [year, month, day] = normalized.split('-')
  if (!year || !month || !day) return ''
  return `${day}/${month}/${year}`
}

function formatInputDate(value: string) {
  const normalized = value?.trim()
  if (!normalized) return ''

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const [year, month, day] = normalized.split('-')
    return `${day}/${month}/${year}`
  }

  const [day, month, year] = normalized.split('/')
  if (!day || !month || !year) return ''
  return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`
}

function formatCep(value: string) {
  const normalized = value.replace(/\D/g, '')
  if (normalized.length <= 5) return normalized
  return `${normalized.slice(0, 5)}-${normalized.slice(5, 8)}`
}

function hasLetters(value: string) {
  return /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(value)
}

function isCompleteDate(value: string) {
  return /^\d{2}\/\d{2}\/\d{4}$/.test(value.trim())
}
