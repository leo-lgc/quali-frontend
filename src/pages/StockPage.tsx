import { Archive, ArrowDown, ArrowUp, Package, Pencil, RotateCcw, Search } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useToast } from '../components/feedback/ToastProvider'
import { ConfirmActionModal } from '../components/modals/ConfirmActionModal'
import { ModalShell } from '../components/modals/ModalShell'
import { useAuth } from '../features/auth/AuthContext'
import { ApiError, apiRequest } from '../lib/api'

type StockScope = 'ACTIVE' | 'ARCHIVED'
type MoveType = 'ENTRY_PURCHASE' | 'EXIT_CONSTRUCTION'

type StockItem = {
  id: number
  name: string
  sku: string
  category: string
  unit: string
  quantity: number
  averageCost: number
  supplier: string | null
}

type StockForm = {
  name: string
  sku: string
  category: string
  unit: string
  averageCost: string
  supplier: string
}

type MovementForm = {
  type: MoveType
  quantity: string
  unitCost: string
  constructionName: string
  note: string
}

type PageResponse<T> = {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
}

const initialStockForm: StockForm = { name: '', sku: '', category: '', unit: 'un', averageCost: '0', supplier: '' }
const initialMovement: MovementForm = { type: 'ENTRY_PURCHASE', quantity: '', unitCost: '', constructionName: '', note: '' }

export function StockPage() {
  const { token, user } = useAuth()
  const toast = useToast()
  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER'

  const [scope, setScope] = useState<StockScope>('ACTIVE')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [items, setItems] = useState<StockItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [isItemModalOpen, setIsItemModalOpen] = useState(false)
  const [itemForm, setItemForm] = useState<StockForm>(initialStockForm)
  const [editingItem, setEditingItem] = useState<StockItem | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false)
  const [movementForm, setMovementForm] = useState<MovementForm>(initialMovement)
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null)
  const [isMoving, setIsMoving] = useState(false)

  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedSearch(search.trim()), 250)
    return () => window.clearTimeout(timeoutId)
  }, [search])

  useEffect(() => {
    void loadItems(debouncedSearch)
  }, [scope, debouncedSearch])

  async function loadItems(query = debouncedSearch) {
    setIsLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: '0', size: '80' })
      if (query) params.set('query', query)
      const endpoint = scope === 'ARCHIVED' ? '/stock/deleted' : '/stock'
      const response = await apiRequest<PageResponse<StockItem>>(`${endpoint}?${params.toString()}`, { token })
      setItems(response.content ?? [])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível carregar o estoque.')
    } finally {
      setIsLoading(false)
    }
  }

  function openCreateItem() {
    setEditingItem(null)
    setItemForm(initialStockForm)
    setIsItemModalOpen(true)
  }

  function openEditItem(item: StockItem) {
    setEditingItem(item)
    setItemForm({
      name: item.name,
      sku: item.sku,
      category: item.category,
      unit: item.unit,
      averageCost: String(item.averageCost ?? 0),
      supplier: item.supplier ?? '',
    })
    setIsItemModalOpen(true)
  }

  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError('')
    try {
      const payload = {
        name: itemForm.name.trim(),
        sku: itemForm.sku.trim(),
        category: itemForm.category.trim(),
        unit: itemForm.unit.trim(),
        averageCost: Number(itemForm.averageCost || '0'),
        supplier: itemForm.supplier.trim() || null,
      }

      if (editingItem) {
        await apiRequest('/stock', { method: 'PATCH', token, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingItem.id, ...payload }) })
        toast.success('Item atualizado com sucesso.')
      } else {
        await apiRequest('/stock', { method: 'POST', token, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        toast.success('Item cadastrado com sucesso.')
      }

      setIsItemModalOpen(false)
      await loadItems()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar o item.')
    } finally {
      setIsSaving(false)
    }
  }

  async function archiveItem() {
    if (!selectedItem) return
    try {
      await apiRequest(`/stock/soft/${selectedItem.id}`, { method: 'DELETE', token })
      toast.success('Item arquivado com sucesso.')
      setIsArchiveModalOpen(false)
      setSelectedItem(null)
      await loadItems()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível arquivar o item.')
    }
  }

  async function retrieveItem(itemId: number) {
    try {
      await apiRequest(`/stock/${itemId}`, { method: 'PATCH', token })
      toast.success('Item recuperado com sucesso.')
      await loadItems()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível recuperar o item.')
    }
  }

  function openMovement(item: StockItem, type: MoveType) {
    setSelectedItem(item)
    setMovementForm({ ...initialMovement, type })
    setIsMoveModalOpen(true)
  }

  async function saveMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedItem) return
    setIsMoving(true)
    try {
      await apiRequest('/stock/movement', {
        method: 'POST',
        token,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: selectedItem.id,
          type: movementForm.type,
          quantity: Number(movementForm.quantity || '0'),
          unitCost: movementForm.type === 'ENTRY_PURCHASE' && movementForm.unitCost ? Number(movementForm.unitCost) : null,
          constructionName: movementForm.type === 'EXIT_CONSTRUCTION' ? movementForm.constructionName.trim() : null,
          note: movementForm.note.trim() || null,
        }),
      })

      toast.success('Movimentação registrada com sucesso.')
      setIsMoveModalOpen(false)
      await loadItems()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível registrar movimentação.')
    } finally {
      setIsMoving(false)
    }
  }

  const totalItems = useMemo(() => items.length, [items])
  const totalUnits = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items])
  const totalInventoryValue = useMemo(() => items.reduce((sum, item) => sum + item.quantity * item.averageCost, 0), [items])

  return (
    <div className="page-stack">
      <section className="works-hero quali-works-hero stock-hero">
        <div className="stock-hero__copy">
          <p className="eyebrow">Estoque global</p>
          <h2 className="section-title">Estoque</h2>
          <p className="section-copy">Controle o saldo da empresa com entradas e saídas separadas das listas de materiais das obras.</p>
        </div>
        <div className="works-hero__actions quali-works-actions stock-hero__actions">
          <div className="hero-mini-stats quali-mini-stats stock-mini-stats">
            <div className="hero-mini-stats__item"><strong>{totalItems}</strong><span>Itens ativos</span></div>
            <div className="hero-mini-stats__item"><strong>{formatQuantity(totalUnits)}</strong><span>Volume total</span></div>
            <div className="hero-mini-stats__item"><strong>{formatCurrency(totalInventoryValue)}</strong><span>Valor estimado</span></div>
          </div>
          {canEdit ? <button type="button" className="primary-button stock-hero__button" onClick={openCreateItem}><Package size={16} />Novo item</button> : null}
        </div>
      </section>

      <article className="work-overview-card work-overview-card--primary">
        <div className="panel__header clients-panel__header">
          <div>
            <h3 className="panel__title">Itens cadastrados</h3>
            <p className="panel__copy">Estoque da empresa, separado das obras.</p>
          </div>
          <div className="clients-toolbar__count stock-toolbar__count">
            <strong>{items.length}</strong>
            <span>{scope === 'ARCHIVED' ? 'arquivados na lista' : 'resultados na tela'}</span>
          </div>
        </div>

        <div className="team-toolbar-row">
          <label className="search-field search-field--board clients-search-field">
            <span className="sr-only">Buscar item</span>
            <span className="clients-search-field__icon" aria-hidden="true"><Search size={16} /></span>
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, SKU ou categoria" />
          </label>
          <div className="works-board-toolbar__filters" role="tablist" aria-label="Filtrar itens por situação">
            <button type="button" className={scope === 'ACTIVE' ? 'board-filter-pill board-filter-pill--active' : 'board-filter-pill'} onClick={() => setScope('ACTIVE')}>Ativos</button>
            <button type="button" className={scope === 'ARCHIVED' ? 'board-filter-pill board-filter-pill--active' : 'board-filter-pill'} onClick={() => setScope('ARCHIVED')}>Arquivados</button>
          </div>
        </div>

        <div className="stock-toolbar-note">
          <strong>{scope === 'ACTIVE' ? 'Operação centralizada.' : 'Consulta de itens arquivados.'}</strong>
          <span>
            {scope === 'ACTIVE'
              ? canEdit
                ? 'Cadastre itens, registre compras e controle saídas para obras sem misturar com o estoque local de cada obra.'
                : 'Você pode consultar saldos e acompanhar a disponibilidade geral da empresa.'
              : 'Recupere itens descontinuados ou revisite o histórico operacional do estoque global.'}
          </span>
        </div>

        {isLoading ? <p className="feedback">Carregando estoque...</p> : null}
        {error && !isLoading ? <p className="form-error">{error}</p> : null}

        {!isLoading && !error ? (
          <div className="stock-table-wrap">
            <table className="stock-table">
              <thead>
                <tr>
                  <th>Item</th><th>Classificação</th><th>Saldo atual</th><th>Custo médio</th><th>Fornecedor</th><th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.length ? items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="stock-item-cell">
                        <strong>{item.name}</strong>
                        <span>SKU {item.sku}</span>
                      </div>
                    </td>
                    <td>
                      <div className="stock-meta-cell">
                        <span className="stock-chip">{item.category}</span>
                        <small>Unidade {item.unit}</small>
                      </div>
                    </td>
                    <td>
                      <div className="stock-balance-cell">
                        <strong>{formatQuantity(item.quantity)}</strong>
                        <span>{item.unit}</span>
                      </div>
                    </td>
                    <td>{formatCurrency(item.averageCost)}</td>
                    <td>{item.supplier || 'Não informado'}</td>
                    <td>
                      <div className="stock-actions">
                        {scope === 'ARCHIVED' ? (
                          canEdit ? <button type="button" className="ghost-page-button stock-action-button" onClick={() => void retrieveItem(item.id)}><RotateCcw size={14} />Recuperar</button> : null
                        ) : (
                          <>
                            {canEdit ? <button type="button" className="ghost-page-button stock-action-button" onClick={() => openEditItem(item)}><Pencil size={14} />Editar</button> : null}
                            {canEdit ? <button type="button" className="ghost-page-button stock-action-button" onClick={() => openMovement(item, 'ENTRY_PURCHASE')}><ArrowUp size={14} />Entrada</button> : null}
                            {canEdit ? <button type="button" className="ghost-page-button stock-action-button" onClick={() => openMovement(item, 'EXIT_CONSTRUCTION')}><ArrowDown size={14} />Saída</button> : null}
                            {canEdit ? <button type="button" className="ghost-page-button stock-action-button" onClick={() => { setSelectedItem(item); setIsArchiveModalOpen(true) }}><Archive size={14} />Arquivar</button> : null}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6}>
                      <div className="stock-empty-state">
                        <strong>{scope === 'ARCHIVED' ? 'Nenhum item arquivado encontrado.' : 'Nenhum item cadastrado ainda.'}</strong>
                        <span>{scope === 'ARCHIVED' ? 'Quando houver itens arquivados, eles aparecerão aqui para recuperação.' : 'Cadastre o primeiro item para começar o controle central do estoque.'}</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </article>

      <ModalShell
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        eyebrow="Estoque"
        title={editingItem ? 'Editar item' : 'Novo item'}
        description={editingItem ? 'Refine os dados mestres do item e mantenha o cadastro central organizado.' : 'Cadastre um item base para controlar saldo, custo e movimentações do estoque global.'}
        className="clients-modal"
      >
        <form className="clients-modal__form stock-item-form" onSubmit={saveItem}>
          <section className="stock-item-hero-card">
            <div className="stock-item-hero-card__identity">
              <strong>{itemForm.name.trim() || (editingItem ? 'Atualize o item' : 'Novo item de estoque')}</strong>
              <span>{itemForm.category.trim() || 'Defina a categoria'} · {itemForm.unit.trim() || 'Unidade pendente'}</span>
            </div>
            <div className="stock-item-hero-card__metrics">
              <div>
                <span>SKU</span>
                <strong>{itemForm.sku.trim() || 'Automático ao salvar'}</strong>
              </div>
              <div>
                <span>Custo médio</span>
                <strong>{formatCurrency(Number(itemForm.averageCost || '0'))}</strong>
              </div>
            </div>
          </section>

          <div className="clients-modal__grid stock-item-grid">
            <label className="field"><span>Nome</span><input value={itemForm.name} onChange={(e) => setItemForm((c) => ({ ...c, name: e.target.value }))} placeholder="Ex.: Cimento CPII 50kg" required /></label>
            <label className="field">
              <span>SKU</span>
              <input value={itemForm.sku} onChange={(e) => setItemForm((c) => ({ ...c, sku: e.target.value }))} placeholder="Opcional. Gerado automaticamente se vazio" />
              <small className="field-help">Se deixar em branco, o sistema cria um SKU unico com base na categoria e no nome.</small>
            </label>
            <label className="field"><span>Categoria</span><input value={itemForm.category} onChange={(e) => setItemForm((c) => ({ ...c, category: e.target.value }))} placeholder="Ex.: Insumos, EPI, Ferramentas" required /></label>
            <label className="field"><span>Unidade</span><input value={itemForm.unit} onChange={(e) => setItemForm((c) => ({ ...c, unit: e.target.value }))} placeholder="Ex.: un, kg, m, caixa" required /></label>
            <label className="field"><span>Custo médio</span><input type="number" step="0.01" min="0" value={itemForm.averageCost} onChange={(e) => setItemForm((c) => ({ ...c, averageCost: e.target.value }))} placeholder="0,00" required /></label>
            <label className="field"><span>Fornecedor</span><input value={itemForm.supplier} onChange={(e) => setItemForm((c) => ({ ...c, supplier: e.target.value }))} placeholder="Fornecedor principal ou referencia" /></label>
          </div>

          <div className="stock-item-note">
            <strong>Cadastro mestre do estoque.</strong>
            <span>Depois de salvar, entradas e saidas passam a atualizar saldo e custo medio sem depender das obras.</span>
          </div>

          <div className="modal-card__actions">
            <button type="button" className="ghost-page-button" onClick={() => setIsItemModalOpen(false)}>Cancelar</button>
            <button type="submit" className="primary-button" disabled={isSaving}>{isSaving ? 'Salvando...' : editingItem ? 'Salvar alteracoes' : 'Cadastrar item'}</button>
          </div>
        </form>
      </ModalShell>

      <ModalShell
        isOpen={isMoveModalOpen && !!selectedItem}
        onClose={() => setIsMoveModalOpen(false)}
        eyebrow="Estoque"
        title={movementForm.type === 'ENTRY_PURCHASE' ? 'Registrar entrada' : 'Registrar saída para obra'}
        description={movementForm.type === 'ENTRY_PURCHASE' ? 'Atualize o saldo global com compras e reposições.' : 'Baixe o saldo do estoque central sem misturar com a lista de materiais da obra.'}
        className="clients-modal"
      >
        <form className="clients-modal__form stock-movement-form" onSubmit={saveMovement}>
          {selectedItem ? (
            <section className="stock-movement-hero-card">
              <div className="stock-movement-hero-card__identity">
                <strong>{selectedItem.name}</strong>
                <span>SKU {selectedItem.sku} · {selectedItem.category}</span>
              </div>
              <div className="stock-movement-hero-card__metrics">
                <div>
                  <span>Saldo atual</span>
                  <strong>{formatQuantity(selectedItem.quantity)} {selectedItem.unit}</strong>
                </div>
                <div>
                  <span>Movimento</span>
                  <strong>{movementForm.type === 'ENTRY_PURCHASE' ? 'Entrada de compra' : 'Saída para obra'}</strong>
                </div>
              </div>
            </section>
          ) : null}

          <div className="clients-modal__grid stock-movement-grid">
            <label className="field">
              <span>Quantidade</span>
              <input type="number" min="0.01" step="0.01" value={movementForm.quantity} onChange={(e) => setMovementForm((c) => ({ ...c, quantity: e.target.value }))} required />
              <small className="field-help">Informe a quantidade em {selectedItem?.unit || 'unidade'}.</small>
            </label>

            {movementForm.type === 'ENTRY_PURCHASE' ? (
              <label className="field">
                <span>Custo unitário</span>
                <input type="number" min="0" step="0.01" value={movementForm.unitCost} onChange={(e) => setMovementForm((c) => ({ ...c, unitCost: e.target.value }))} />
                <small className="field-help">Opcional. Atualiza o custo médio do item.</small>
              </label>
            ) : (
              <label className="field">
                <span>Obra</span>
                <input value={movementForm.constructionName} onChange={(e) => setMovementForm((c) => ({ ...c, constructionName: e.target.value }))} placeholder="Nome da obra de destino" required />
                <small className="field-help">Use o nome da obra para rastrear esta saída.</small>
              </label>
            )}
          </div>

          <label className="field field--full">
            <span>Observação</span>
            <textarea className="textarea-field" rows={4} value={movementForm.note} onChange={(e) => setMovementForm((c) => ({ ...c, note: e.target.value }))} placeholder={movementForm.type === 'ENTRY_PURCHASE' ? 'Ex.: compra emergencial, reposição mensal, fornecedor XYZ.' : 'Ex.: envio parcial para concretagem, retirada para acabamento, ajuste operacional.'} />
          </label>

          <div className="modal-card__actions">
            <button type="button" className="ghost-page-button" onClick={() => setIsMoveModalOpen(false)}>Cancelar</button>
            <button type="submit" className="primary-button" disabled={isMoving}>{isMoving ? 'Salvando...' : movementForm.type === 'ENTRY_PURCHASE' ? 'Registrar entrada' : 'Registrar saída'}</button>
          </div>
        </form>
      </ModalShell>

      <ConfirmActionModal
        isOpen={isArchiveModalOpen && !!selectedItem}
        onClose={() => { setIsArchiveModalOpen(false); setSelectedItem(null) }}
        onConfirm={() => void archiveItem()}
        eyebrow="Estoque"
        title="Arquivar item"
        description="O item sairá da lista ativa do estoque da empresa."
        confirmLabel="Confirmar arquivamento"
        summary={selectedItem ? <><strong>{selectedItem.name}</strong><span>{selectedItem.sku}</span></> : null}
      />
    </div>
  )
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value || 0)
}
