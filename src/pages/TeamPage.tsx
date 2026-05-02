import { Archive, Pencil, Plus, RotateCcw, Search, Shield, UserRound } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useToast } from '../components/feedback/ToastProvider'
import { ConfirmActionModal } from '../components/modals/ConfirmActionModal'
import { ModalShell } from '../components/modals/ModalShell'
import { useAuth } from '../features/auth/AuthContext'
import { ApiError, apiRequest } from '../lib/api'

type Role = 'ADMIN' | 'MANAGER' | 'USER'
type TeamScope = 'ACTIVE' | 'ARCHIVED'

type TeamUser = {
  id: number
  name: string
  email: string
  role: Role
}

type RegisterForm = {
  name: string
  email: string
  password: string
  role: Role
}

type EditUserForm = {
  name: string
  email: string
  role: Role
}

type PageResponse<T> = {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
}

const roleOrder: Role[] = ['ADMIN', 'MANAGER', 'USER']
const teamPageSize = 8

const initialRegisterForm: RegisterForm = {
  name: '',
  email: '',
  password: '',
  role: 'USER',
}

export function TeamPage() {
  const { token, user } = useAuth()
  const toast = useToast()

  const [users, setUsers] = useState<TeamUser[]>([])
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  const [totalFilteredUsers, setTotalFilteredUsers] = useState(0)
  const [totalsByRole, setTotalsByRole] = useState({ ADMIN: 0, MANAGER: 0, USER: 0 })
  const [scope, setScope] = useState<TeamScope>('ACTIVE')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [registerForm, setRegisterForm] = useState<RegisterForm>(initialRegisterForm)
  const [isRegistering, setIsRegistering] = useState(false)
  const [registerError, setRegisterError] = useState('')

  const [selectedUser, setSelectedUser] = useState<TeamUser | null>(null)
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [archiveError, setArchiveError] = useState('')
  const [selectedRoleUser, setSelectedRoleUser] = useState<TeamUser | null>(null)
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false)
  const [editUserForm, setEditUserForm] = useState<EditUserForm>({ name: '', email: '', role: 'USER' })
  const [isSavingRole, setIsSavingRole] = useState(false)
  const [roleEditError, setRoleEditError] = useState('')

  const registerFieldError = useMemo(() => buildRegisterFieldError(registerError), [registerError])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedSearch(search.trim()), 250)
    return () => window.clearTimeout(timeoutId)
  }, [search])

  useEffect(() => {
    void loadUsers(1, debouncedSearch)
    void loadRoleTotals()
  }, [token, debouncedSearch, scope])

  async function loadUsers(page = currentPage, query = debouncedSearch) {
    setIsLoading(true)
    setError('')

    try {
      const params = new URLSearchParams({ page: String(page - 1), size: String(teamPageSize) })
      if (query) params.set('query', query)

      const endpoint = scope === 'ARCHIVED' ? '/user/deleted' : '/user'
      const response = await apiRequest<PageResponse<TeamUser>>(`${endpoint}?${params.toString()}`, { token })
      setUsers(response.content ?? [])
      setCurrentPage(response.number + 1)
      setTotalFilteredUsers(response.totalElements)

      if (query) {
        const totalResponse = await apiRequest<PageResponse<TeamUser>>(`/user?page=0&size=1`, { token })
        setTotalUsers(scope === 'ARCHIVED' ? response.totalElements : totalResponse.totalElements)
      } else {
        setTotalUsers(response.totalElements)
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Não foi possível carregar os colaboradores.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function loadRoleTotals() {
    try {
      const responses = await Promise.all(
        roleOrder.map((role) => apiRequest<PageResponse<TeamUser>>(`/user/role/${role}?page=0&size=1`, { token })),
      )

      setTotalsByRole({
        ADMIN: responses[0].totalElements,
        MANAGER: responses[1].totalElements,
        USER: responses[2].totalElements,
      })
    } catch {
      setTotalsByRole({ ADMIN: 0, MANAGER: 0, USER: 0 })
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsRegistering(true)
    setRegisterError('')

    try {
      await apiRequest('/auth/register', {
        method: 'POST',
        token,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerForm),
      })

      setRegisterForm(initialRegisterForm)
      toast.success('Colaborador cadastrado com sucesso.')
      await Promise.all([loadUsers(1, debouncedSearch), loadRoleTotals()])
    } catch (err) {
      if (err instanceof ApiError) {
        setRegisterError(err.message)
      } else {
        setRegisterError('Não foi possível cadastrar o colaborador.')
      }
    } finally {
      setIsRegistering(false)
    }
  }

  function openArchiveModal(user: TeamUser) {
    setSelectedUser(user)
    setArchiveError('')
    setIsArchiveModalOpen(true)
  }

  function closeArchiveModal() {
    setIsArchiveModalOpen(false)
    setSelectedUser(null)
    setArchiveError('')
  }

  async function handleArchiveUser() {
    if (!selectedUser) return

    setIsArchiving(true)
    setArchiveError('')

    try {
      await apiRequest(`/user/soft/${selectedUser.id}`, {
        method: 'DELETE',
        token,
      })

      closeArchiveModal()
      toast.success('Colaborador arquivado com sucesso.')
      await Promise.all([loadUsers(Math.max(1, currentPage - (users.length === 1 ? 1 : 0)), debouncedSearch), loadRoleTotals()])
    } catch (err) {
      if (err instanceof ApiError) {
        setArchiveError(err.message)
      } else {
        setArchiveError('Não foi possível arquivar o colaborador.')
      }
    } finally {
      setIsArchiving(false)
    }
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, scope])

  async function handleRetrieveUser(userId: number) {
    try {
      await apiRequest(`/user/${userId}`, {
        method: 'PATCH',
        token,
      })

      toast.success('Colaborador recuperado com sucesso.')
      await Promise.all([loadUsers(currentPage, debouncedSearch), loadRoleTotals()])
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Não foi possível recuperar o colaborador.')
      }
    }
  }

  function openRoleModal(member: TeamUser) {
    setSelectedRoleUser(member)
    setEditUserForm({
      name: member.name,
      email: member.email,
      role: member.role,
    })
    setRoleEditError('')
    setIsRoleModalOpen(true)
  }

  function closeRoleModal() {
    setIsRoleModalOpen(false)
    setSelectedRoleUser(null)
    setRoleEditError('')
  }

  async function handleUpdateUserRole() {
    if (!selectedRoleUser) {
      return
    }

    const hasChanged =
      editUserForm.name.trim() !== selectedRoleUser.name ||
      editUserForm.email.trim() !== selectedRoleUser.email ||
      editUserForm.role !== selectedRoleUser.role

    if (!hasChanged) {
      return
    }

    setIsSavingRole(true)
    setRoleEditError('')

    try {
      await apiRequest('/user', {
        method: 'PATCH',
        token,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedRoleUser.id,
          name: editUserForm.name.trim(),
          email: editUserForm.email.trim(),
          role: editUserForm.role,
        }),
      })

      toast.success('Perfil atualizado com sucesso.')
      closeRoleModal()
      await Promise.all([loadUsers(currentPage, debouncedSearch), loadRoleTotals()])
    } catch (err) {
      if (err instanceof ApiError) {
        setRoleEditError(err.message)
      } else {
        setRoleEditError('Não foi possível atualizar o perfil do colaborador.')
      }
    } finally {
      setIsSavingRole(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalFilteredUsers / teamPageSize))

  return (
    <>
      <div className="page-stack">
        <section className="works-hero quali-works-hero team-hero">
          <div>
            <p className="eyebrow">Gestão de equipe</p>
            <h2 className="section-title">Colaboradores</h2>
          </div>

          <div className="works-hero__actions quali-works-actions">
            <div className="hero-mini-stats quali-mini-stats">
              <div className="hero-mini-stats__item">
                <strong>{totalUsers}</strong>
                <span>Total</span>
              </div>
              <div className="hero-mini-stats__item">
                <strong>{totalsByRole.ADMIN}</strong>
                <span>Admins</span>
              </div>
              <div className="hero-mini-stats__item">
                <strong>{totalsByRole.MANAGER}</strong>
                <span>Gestores</span>
              </div>
            </div>
          </div>
        </section>

        <section className="detail-header-grid clients-layout-grid">
          <article className="work-overview-card work-overview-card--primary">
            <div className="panel__header clients-panel__header">
              <div>
                <h3 className="panel__title">Usuários cadastrados</h3>
                <p className="panel__copy">Lista geral por nome, email e perfil.</p>
              </div>

              <div className="clients-toolbar__count">
                <strong>{totalFilteredUsers}</strong>
                <span>resultados</span>
              </div>
            </div>

            <div className="team-toolbar-row">
              <label className="search-field search-field--board clients-search-field">
                <span className="sr-only">Buscar colaborador</span>
                <span className="clients-search-field__icon" aria-hidden="true">
                  <Search size={16} />
                </span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por nome, email ou perfil"
                />
              </label>

              <div className="works-board-toolbar__filters" role="tablist" aria-label="Filtrar colaboradores por situação">
                <button
                  type="button"
                  className={scope === 'ACTIVE' ? 'board-filter-pill board-filter-pill--active' : 'board-filter-pill'}
                  onClick={() => setScope('ACTIVE')}
                >
                  Ativos
                </button>
                <button
                  type="button"
                  className={scope === 'ARCHIVED' ? 'board-filter-pill board-filter-pill--active' : 'board-filter-pill'}
                  onClick={() => setScope('ARCHIVED')}
                >
                  Arquivados
                </button>
              </div>
            </div>

            {isLoading ? <p className="feedback">Carregando colaboradores...</p> : null}
            {!isLoading && error ? <p className="form-error">{error}</p> : null}

            {!isLoading && !error ? (
              <div className="team-directory-list">
                {users.length ? (
                  users.map((member) => (
                    <article key={member.id} className="team-directory-card">
                      <div className="team-directory-card__header">
                        <div className="team-directory-card__identity">
                          <div className="team-directory-card__icon">
                            <UserRound size={18} />
                          </div>
                          <div>
                            <strong>{member.name}</strong>
                            <p>{member.email}</p>
                          </div>
                        </div>
                        <div className="team-directory-card__badges">
                          <span className={`team-role-pill team-role-pill--${member.role.toLowerCase()}`}>
                            {getRoleLabel(member.role)}
                          </span>
                          <span className={scope === 'ARCHIVED' ? 'client-card__badge client-card__badge--archived' : 'client-card__badge'}>
                            {scope === 'ARCHIVED' ? 'Arquivado' : 'Ativo'}
                          </span>
                        </div>
                      </div>

                      <div className="team-directory-card__footer">
                        <p className="construction-card__id">ID #{member.id}</p>
                        {scope === 'ACTIVE' ? (
                          <div className="team-directory-card__actions">
                            <button
                              type="button"
                              className="ghost-page-button team-directory-card__archive"
                              onClick={() => openRoleModal(member)}
                            >
                              <Pencil size={15} />
                              Editar perfil
                            </button>
                            <button
                              type="button"
                              className="ghost-page-button team-directory-card__archive"
                              onClick={() => openArchiveModal(member)}
                            >
                              <Archive size={15} />
                              Arquivar
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="ghost-page-button team-directory-card__archive"
                            onClick={() => void handleRetrieveUser(member.id)}
                          >
                            <RotateCcw size={15} />
                            Recuperar
                          </button>
                        )}
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="feedback">Nenhum colaborador encontrado para o filtro atual.</p>
                )}

                {totalFilteredUsers > teamPageSize ? (
                  <div className="list-pagination">
                    <button
                      type="button"
                      className="ghost-page-button list-pagination__button"
                      onClick={() => void loadUsers(currentPage - 1, debouncedSearch)}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </button>
                    <span className="list-pagination__status">
                      Página {currentPage} de {totalPages}
                    </span>
                    <button
                      type="button"
                      className="ghost-page-button list-pagination__button"
                      onClick={() => void loadUsers(currentPage + 1, debouncedSearch)}
                      disabled={currentPage === totalPages}
                    >
                      Próxima
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </article>

          <article className="work-overview-card detail-side-actions">
            <div className="work-overview-card__header">
              <div>
                <h3>Novo colaborador</h3>
                <p>Cadastro para perfil de acesso.</p>
              </div>
            </div>

            <form className="auth-form team-register-form" onSubmit={handleRegister}>
              <label className="field">
                <span>Nome</span>
                <input
                  type="text"
                  value={registerForm.name}
                  onChange={(event) => {
                    setRegisterError('')
                    setRegisterForm((current) => ({ ...current, name: event.target.value }))
                  }}
                  className={registerFieldError.name ? 'input-error' : undefined}
                  aria-invalid={registerFieldError.name}
                  required
                />
              </label>

              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  value={registerForm.email}
                  onChange={(event) => {
                    setRegisterError('')
                    setRegisterForm((current) => ({ ...current, email: event.target.value }))
                  }}
                  className={registerFieldError.email ? 'input-error' : undefined}
                  aria-invalid={registerFieldError.email}
                  required
                />
              </label>

              <label className="field">
                <span>Senha inicial</span>
                <input
                  type="password"
                  value={registerForm.password}
                  onChange={(event) => {
                    setRegisterError('')
                    setRegisterForm((current) => ({ ...current, password: event.target.value }))
                  }}
                  minLength={6}
                  className={registerFieldError.password ? 'input-error' : undefined}
                  aria-invalid={registerFieldError.password}
                  required
                />
              </label>

              <label className="field">
                <span>Perfil</span>
                <select
                  className={registerFieldError.role ? 'select-field input-error' : 'select-field'}
                  value={registerForm.role}
                  onChange={(event) => {
                    setRegisterError('')
                    setRegisterForm((current) => ({
                      ...current,
                      role: event.target.value as Role,
                    }))
                  }}
                  aria-invalid={registerFieldError.role}
                >
                  <option value="USER">Usuário</option>
                  <option value="MANAGER">Gestor</option>
                  {user?.role === 'ADMIN' ? <option value="ADMIN">Administrador</option> : null}
                </select>
              </label>

              {registerError ? <p className="form-error">{registerError}</p> : null}

              <button type="submit" className="primary-button team-register-form__submit" disabled={isRegistering}>
                <Plus size={17} />
                {isRegistering ? 'Salvando...' : 'Cadastrar colaborador'}
              </button>
            </form>

            <div className="team-summary-note">
              <Shield size={16} />
              <span>Somente administradores podem cadastrar colaboradores.</span>
            </div>
          </article>
        </section>
      </div>

      <ConfirmActionModal
        isOpen={isArchiveModalOpen && !!selectedUser}
        onClose={closeArchiveModal}
        onConfirm={() => void handleArchiveUser()}
        eyebrow="Equipe"
        title="Arquivar colaborador"
        description="O usuário sairá da lista principal de equipe ativa."
        confirmLabel="Confirmar arquivamento"
        isSubmitting={isArchiving}
        error={archiveError}
        summary={
          selectedUser ? (
            <>
              <strong>{selectedUser.name}</strong>
              <span>{selectedUser.email}</span>
              <span>{getRoleLabel(selectedUser.role)}</span>
            </>
          ) : null
        }
      />

      <ModalShell
        isOpen={isRoleModalOpen && !!selectedRoleUser}
        onClose={closeRoleModal}
        eyebrow="Equipe"
        title="Editar perfil"
        description="Atualize o papel de acesso do colaborador."
        className="clients-modal modal-card--edit"
      >
        <div className="team-role-edit-modal">
          {selectedRoleUser ? (
            <div className="team-role-edit-modal__identity">
              <strong>{selectedRoleUser.name}</strong>
              <span>{selectedRoleUser.email}</span>
            </div>
          ) : null}

          <label className="field">
            <span>Nome</span>
            <input
              type="text"
              value={editUserForm.name}
              onChange={(event) => setEditUserForm((current) => ({ ...current, name: event.target.value }))}
              disabled={isSavingRole}
              required
            />
          </label>

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={editUserForm.email}
              onChange={(event) => setEditUserForm((current) => ({ ...current, email: event.target.value }))}
              disabled={isSavingRole}
              required
            />
          </label>

          <label className="field">
            <span>Perfil</span>
            <select
              className="select-field"
              value={editUserForm.role}
              onChange={(event) => setEditUserForm((current) => ({ ...current, role: event.target.value as Role }))}
              disabled={isSavingRole}
            >
              <option value="USER">Usuário</option>
              <option value="MANAGER">Gestor</option>
              {user?.role === 'ADMIN' ? <option value="ADMIN">Administrador</option> : null}
            </select>
          </label>

          {roleEditError ? <p className="form-error">{roleEditError}</p> : null}

          <div className="modal-card__actions">
            <button type="button" className="ghost-page-button" onClick={closeRoleModal} disabled={isSavingRole}>
              Cancelar
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => void handleUpdateUserRole()}
              disabled={
                !selectedRoleUser ||
                (
                  editUserForm.name.trim() === selectedRoleUser.name &&
                  editUserForm.email.trim() === selectedRoleUser.email &&
                  editUserForm.role === selectedRoleUser.role
                ) ||
                !editUserForm.name.trim() ||
                !editUserForm.email.trim() ||
                isSavingRole
              }
            >
              {isSavingRole ? 'Salvando...' : 'Salvar perfil'}
            </button>
          </div>
        </div>
      </ModalShell>
    </>
  )
}

function getRoleLabel(role: Role) {
  if (role === 'ADMIN') return 'Administrador'
  if (role === 'MANAGER') return 'Gestor'
  return 'Usuário'
}

function buildRegisterFieldError(error: string) {
  const normalizedError = error.toLowerCase()

  return {
    name: normalizedError.includes('nome'),
    email: normalizedError.includes('email') || normalizedError.includes('e-mail'),
    password: normalizedError.includes('senha') || normalizedError.includes('password'),
    role: normalizedError.includes('perfil') || normalizedError.includes('role'),
  }
}
