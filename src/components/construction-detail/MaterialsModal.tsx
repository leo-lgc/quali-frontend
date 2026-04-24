import { Minus, PackagePlus, Plus, Trash2 } from 'lucide-react'
import type { FormEvent } from 'react'
import { ModalShell } from '../modals/ModalShell'

type Material = {
  id: number
  name: string
  amount: number
  isAvailable: boolean
}

type MaterialFormState = {
  name: string
  amount: string
}

type MaterialsModalProps = {
  isOpen: boolean
  onClose: () => void
  materials: Material[]
  form: MaterialFormState
  isSubmitting: boolean
  actionMaterialId: number | null
  error: string
  onFormChange: (field: keyof MaterialFormState, value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onIncrease: (materialId: number) => void
  onDecrease: (materialId: number, currentAmount: number) => void
  onDelete: (materialId: number) => void
  editingMaterialId: number | null
  editingForm: MaterialFormState
  onStartEdit: (material: Material) => void
  onCancelEdit: () => void
  onEditFormChange: (field: keyof MaterialFormState, value: string) => void
  onSaveEdit: (materialId: number) => void
}

export function MaterialsModal({
  isOpen,
  onClose,
  materials,
  form,
  isSubmitting,
  actionMaterialId,
  error,
  onFormChange,
  onSubmit,
  onIncrease,
  onDecrease,
  onDelete,
  editingMaterialId,
  editingForm,
  onStartEdit,
  onCancelEdit,
  onEditFormChange,
  onSaveEdit,
}: MaterialsModalProps) {
  const availableCount = materials.filter((m) => m.isAvailable).length

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      eyebrow="Materiais da obra"
      title="Lista de materiais"
      description="Adicione, ajuste e controle os itens da obra."
      className="materials-modal"
      ariaLabel="Lista de materiais da obra"
    >
      <div className="panel materials-panel">
        <div className="panel__header">
          <div>
            <h3 className="panel__title">Itens cadastrados</h3>
            <p className="panel__copy">
              {availableCount} de {materials.length} disponiveis.
            </p>
          </div>
          <span className="weather-pill">
            {availableCount} / {materials.length}
          </span>
        </div>

        <form className="materials-form" onSubmit={onSubmit}>
          <div className="materials-form__header">
            <strong>Novo material</strong>
            <span>Adicione itens e ajuste a quantidade depois.</span>
          </div>

          <div className="materials-form__grid">
            <label className="field">
              <span>Nome</span>
              <input
                type="text"
                value={form.name}
                onChange={(event) => onFormChange('name', event.target.value)}
                placeholder="Ex.: Cimento CP II"
                required
              />
            </label>

            <label className="field">
              <span>Quantidade inicial</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(event) => onFormChange('amount', event.target.value)}
                placeholder="0"
                required
              />
            </label>
          </div>

          {error ? <p className="form-error">{error}</p> : null}

          <button type="submit" className="primary-button materials-form__submit" disabled={isSubmitting}>
            <PackagePlus size={17} />
            {isSubmitting ? 'Salvando...' : 'Adicionar material'}
          </button>
        </form>

        <div className="stack-list materials-stack-list">
          {materials.length ? (
            materials.map((material) => {
              const isRowLoading = actionMaterialId === material.id
              const isEditing = editingMaterialId === material.id

              return (
                <article key={material.id} className="list-row detail-list-row material-row">
                  <div>
                    <p className="construction-card__id">Material #{material.id}</p>
                    {isEditing ? (
                      <div className="material-edit-grid">
                        <input
                          type="text"
                          value={editingForm.name}
                          onChange={(event) => onEditFormChange('name', event.target.value)}
                          placeholder="Nome do material"
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editingForm.amount}
                          onChange={(event) => onEditFormChange('amount', event.target.value)}
                          placeholder="Quantidade"
                        />
                      </div>
                    ) : (
                      <strong>{material.name}</strong>
                    )}
                  </div>

                  <div className="material-row__meta">
                    <span className="weather-pill">Qtd: {formatAmount(material.amount)}</span>
                    <div className="material-row__actions">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            className="ghost-page-button"
                            onClick={onCancelEdit}
                            disabled={isRowLoading}
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            className="ghost-page-button"
                            onClick={() => onSaveEdit(material.id)}
                            disabled={isRowLoading || !editingForm.name.trim()}
                          >
                            Salvar
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="ghost-page-button"
                          onClick={() => onStartEdit(material)}
                          disabled={isRowLoading}
                        >
                          Editar
                        </button>
                      )}

                      <button
                        type="button"
                        className="ghost-page-button"
                        onClick={() => onDecrease(material.id, material.amount)}
                        disabled={isRowLoading || material.amount <= 0 || isEditing}
                      >
                        <Minus size={15} />
                        Remover
                      </button>
                      <button
                        type="button"
                        className="ghost-page-button"
                        onClick={() => onIncrease(material.id)}
                        disabled={isRowLoading || isEditing}
                      >
                        <Plus size={15} />
                        Somar
                      </button>
                      <button
                        type="button"
                        className="ghost-page-button"
                        onClick={() => onDelete(material.id)}
                        disabled={isRowLoading || isEditing}
                      >
                        <Trash2 size={15} />
                        Excluir
                      </button>
                    </div>
                  </div>
                </article>
              )
            })
          ) : (
            <div className="materials-empty-state">
              <strong>Nenhum material cadastrado.</strong>
              <span>Adicione o primeiro item para iniciar o controle.</span>
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  )
}

function formatAmount(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value)
}
