import { Minus, PackagePlus, Plus, Trash2 } from 'lucide-react'
import type { FormEvent } from 'react'
import { DetailInfoSection } from './DetailInfoSection'

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

type MaterialsSectionProps = {
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
}

export function MaterialsSection({
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
}: MaterialsSectionProps) {
  return (
    <DetailInfoSection title="Materiais" copy="Lista da obra.">
      <div className="materials-layout">
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

              return (
                <article key={material.id} className="list-row detail-list-row material-row">
                  <div>
                    <p className="construction-card__id">Material #{material.id}</p>
                    <strong>{material.name}</strong>
                  </div>

                  <div className="material-row__meta">
                    <span className="weather-pill">Qtd: {formatAmount(material.amount)}</span>
                    <span className={material.isAvailable ? 'status-pill status-pill--completed' : 'status-pill status-pill--scheduled'}>
                      {material.isAvailable ? 'Disponível' : 'Indisponível'}
                    </span>
                    <div className="material-row__actions">
                      <button
                        type="button"
                        className="ghost-page-button"
                        onClick={() => onDecrease(material.id, material.amount)}
                        disabled={isRowLoading || material.amount <= 0}
                      >
                        <Minus size={15} />
                        Remover
                      </button>
                      <button
                        type="button"
                        className="ghost-page-button"
                        onClick={() => onIncrease(material.id)}
                        disabled={isRowLoading}
                      >
                        <Plus size={15} />
                        Somar
                      </button>
                      <button
                        type="button"
                        className="ghost-page-button"
                        onClick={() => onDelete(material.id)}
                        disabled={isRowLoading}
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
    </DetailInfoSection>
  )
}

function formatAmount(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value)
}
