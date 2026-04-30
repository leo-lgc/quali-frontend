import { Check, Plus, Trash2 } from 'lucide-react'
import type { FormEvent } from 'react'
import { ModalShell } from '../modals/ModalShell'

type CheckListItem = {
  id: number
  title: string
  checked: boolean
}

type ChecklistModalProps = {
  isOpen: boolean
  onClose: () => void
  checklistProgress: { done: number; total: number }
  checkListId: number | null
  checklistItems: CheckListItem[]
  isChecklistLoading: boolean
  checklistError: string
  isCreatingChecklist: boolean
  isCreatingItem: boolean
  newChecklistItem: string
  onNewChecklistItemChange: (value: string) => void
  onCreateChecklist: () => void
  onCreateChecklistItem: (event: FormEvent<HTMLFormElement>) => void
  onToggleChecklistItem: (itemId: number) => void
  onDeleteChecklistItem: (itemId: number) => void
}

export function ChecklistModal({
  isOpen,
  onClose,
  checklistProgress,
  checkListId,
  checklistItems,
  isChecklistLoading,
  checklistError,
  isCreatingChecklist,
  isCreatingItem,
  newChecklistItem,
  onNewChecklistItemChange,
  onCreateChecklist,
  onCreateChecklistItem,
  onToggleChecklistItem,
  onDeleteChecklistItem,
}: ChecklistModalProps) {
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      eyebrow="Checklist da obra"
      title="Escopo e etapas planejadas"
      description="Crie e acompanhe os itens da obra."
      className="checklist-modal"
      ariaLabel="Checklist da obra"
    >
      <div className="panel checklist-panel">
        <div className="panel__header">
          <div>
            <h3 className="panel__title">Itens do checklist</h3>
            <p className="panel__copy">
              {checklistProgress.done} de {checklistProgress.total} concluídos.
            </p>
          </div>
          <span className="weather-pill">
            {checklistProgress.done} / {checklistProgress.total}
          </span>
        </div>

        {!checkListId ? (
          <div className="checklist-empty-state">
            <p className="panel__copy">Checklist ainda não criado.</p>
            <button type="button" className="primary-button" onClick={onCreateChecklist} disabled={isCreatingChecklist}>
              {isCreatingChecklist ? 'Criando checklist...' : 'Criar checklist'}
            </button>
          </div>
        ) : (
          <form className="checklist-create-form" onSubmit={onCreateChecklistItem}>
            <input
              type="text"
              value={newChecklistItem}
              onChange={(event) => onNewChecklistItemChange(event.target.value)}
              placeholder="Adicionar novo item ao checklist"
            />
            <button type="submit" className="primary-button" disabled={isCreatingItem || !newChecklistItem.trim()}>
              <Plus size={16} />
              {isCreatingItem ? 'Salvando...' : 'Adicionar item'}
            </button>
          </form>
        )}

        {isChecklistLoading ? <p className="feedback">Carregando checklist...</p> : null}
        {checklistError ? <p className="form-error">{checklistError}</p> : null}

        <div className="stack-list">
          {checkListId && checklistItems.length ? (
            checklistItems.map((item) => (
              <article key={item.id} className="list-row detail-list-row checklist-row">
                <div>
                  <p className="construction-card__id">Item #{item.id}</p>
                  <strong>{item.title}</strong>
                </div>
                <div className="checklist-row__actions">
                  <button
                    type="button"
                    className={item.checked ? 'checklist-toggle checklist-toggle--done' : 'checklist-toggle'}
                    onClick={() => onToggleChecklistItem(item.id)}
                  >
                    <Check size={16} />
                    {item.checked ? 'Concluído' : 'Marcar'}
                  </button>
                  <button type="button" className="ghost-page-button" onClick={() => onDeleteChecklistItem(item.id)}>
                    <Trash2 size={16} />
                    Excluir
                  </button>
                </div>
              </article>
            ))
          ) : checkListId && !isChecklistLoading ? (
            <p className="feedback">Ainda não existem itens de checklist para esta obra.</p>
          ) : null}
        </div>
      </div>
    </ModalShell>
  )
}
