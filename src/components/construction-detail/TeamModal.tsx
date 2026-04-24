import { Trash2, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ModalShell } from '../modals/ModalShell'

type Worker = {
  id: number
  email: string
}

type AvailableUser = {
  id: number
  name: string
  email: string
}

type PagedResponse<T> = {
  content: T[]
}

type TeamModalProps = {
  isOpen: boolean
  onClose: () => void
  workers: Worker[]
  constructionId: string
  token: string
  onTeamUpdated: () => void
  apiRequest: <T>(url: string, options: Record<string, unknown>) => Promise<T>
  toast: { success: (msg: string) => void; error: (msg: string) => void }
}

export function TeamModal({
  isOpen,
  onClose,
  workers,
  constructionId,
  token,
  onTeamUpdated,
  apiRequest,
  toast,
}: TeamModalProps) {
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [isSaving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return

    async function loadUsers() {
      setIsLoadingUsers(true)
      setError('')

      try {
        const [usersRes, managersRes, adminsRes] = await Promise.all([
          apiRequest<PagedResponse<AvailableUser>>('/user/role/USER', { token }),
          apiRequest<PagedResponse<AvailableUser>>('/user/role/MANAGER', { token }),
          apiRequest<PagedResponse<AvailableUser>>('/user/role/ADMIN', { token }),
        ])

        const allUsers = [
          ...(usersRes.content ?? []),
          ...(managersRes.content ?? []),
          ...(adminsRes.content ?? []),
        ]

        const uniqueMap = new Map<number, AvailableUser>()
        for (const user of allUsers) {
          uniqueMap.set(user.id, user)
        }

        setAvailableUsers(Array.from(uniqueMap.values()))
      } catch {
        setError('Nao foi possivel carregar usuarios.')
      } finally {
        setIsLoadingUsers(false)
      }
    }

    void loadUsers()
  }, [isOpen, token, apiRequest])

  const workerIds = workers.map((w) => w.id)
  const filteredUsers = availableUsers.filter((u) => !workerIds.includes(u.id))

  async function handleAddWorker() {
    if (!selectedUserId) return

    setSaving(true)
    setError('')

    const newWorkerIds = [...workerIds, Number(selectedUserId)]

    try {
      await apiRequest('/construction/update', {
        method: 'PATCH',
        token,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: Number(constructionId),
          workersIds: newWorkerIds,
        }),
      })

      setSelectedUserId('')
      onTeamUpdated()
      toast.success('Colaborador adicionado com sucesso.')
    } catch {
      setError('Nao foi possivel adicionar o colaborador.')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemoveWorker(workerId: number) {
    setSaving(true)
    setError('')

    const newWorkerIds = workerIds.filter((id) => id !== workerId)

    try {
      await apiRequest('/construction/update', {
        method: 'PATCH',
        token,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: Number(constructionId),
          workersIds: newWorkerIds,
        }),
      })

      onTeamUpdated()
      toast.success('Colaborador removido com sucesso.')
    } catch {
      setError('Nao foi possivel remover o colaborador.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      eyebrow="Equipe da obra"
      title="Colaboradores vinculados"
      description="Gerencie a equipe alocada nesta obra."
      className="team-modal"
      ariaLabel="Equipe da obra"
    >
      <div className="panel team-panel">
        <div className="panel__header">
          <div>
            <h3 className="panel__title">Equipe atual</h3>
            <p className="panel__copy">
              {workers.length} {workers.length === 1 ? 'colaborador vinculado' : 'colaboradores vinculados'}.
            </p>
          </div>
          <span className="weather-pill">{workers.length}</span>
        </div>

        <div className="team-add-form">
          <label className="field team-add-form__select">
            <span>Adicionar colaborador</span>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              disabled={isLoadingUsers || isSaving}
            >
              <option value="">
                {isLoadingUsers ? 'Carregando...' : 'Selecione um colaborador'}
              </option>
              {filteredUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="primary-button team-add-form__submit"
            onClick={() => void handleAddWorker()}
            disabled={!selectedUserId || isSaving}
          >
            <UserPlus size={17} />
            {isSaving ? 'Salvando...' : 'Adicionar'}
          </button>
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="stack-list team-stack-list">
          {workers.length ? (
            workers.map((worker) => {
              const userInfo = availableUsers.find((u) => u.id === worker.id)

              return (
                <article key={worker.id} className="list-row detail-list-row team-row">
                  <div>
                    <p className="construction-card__id">ID #{worker.id}</p>
                    <strong>{userInfo?.name ?? worker.email}</strong>
                    {userInfo?.name ? <span className="team-row__email">{worker.email}</span> : null}
                  </div>
                  <div className="team-row__actions">
                    <button
                      type="button"
                      className="ghost-page-button"
                      onClick={() => void handleRemoveWorker(worker.id)}
                      disabled={isSaving}
                    >
                      <Trash2 size={15} />
                      Remover
                    </button>
                  </div>
                </article>
              )
            })
          ) : (
            <div className="team-empty-state">
              <strong>Nenhum colaborador vinculado.</strong>
              <span>Adicione o primeiro membro da equipe.</span>
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  )
}
