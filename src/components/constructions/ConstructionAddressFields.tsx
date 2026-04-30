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

type ConstructionAddressFieldsProps = {
  form: ConstructionFormState
  isFetchingCep: boolean
  cepError: string
  onChange: (field: keyof ConstructionFormState, value: string) => void
  onCepChange: (value: string) => void
}

export function ConstructionAddressFields({
  form,
  isFetchingCep,
  cepError,
  onChange,
  onCepChange,
}: ConstructionAddressFieldsProps) {
  return (
    <>
      <section className="modal-section modal-section--soft">
        <div className="modal-section__header">
          <span className="panel__eyebrow">Endereço</span>
          <p className="panel__copy">Endereço da obra.</p>
        </div>

        <div className="works-form__grid">
          <label className="field field--full">
            <span>CEP</span>
            <input type="text" value={form.cep} onChange={(event) => onCepChange(event.target.value)} placeholder="Digite o CEP" required />
            <small className="field-help">{isFetchingCep ? 'Buscando endereço...' : 'Preenchimento automático via CEP.'}</small>
            {cepError ? <small className="field-help field-help--error">{cepError}</small> : null}
          </label>

          <label className="field">
            <span>Cidade</span>
            <input type="text" value={form.city} onChange={(event) => onChange('city', event.target.value)} placeholder="Digite a cidade" required />
          </label>

          <label className="field">
            <span>Rua</span>
            <input type="text" value={form.street} onChange={(event) => onChange('street', event.target.value)} placeholder="Digite a rua" required />
          </label>

          <label className="field">
            <span>Bairro</span>
            <input type="text" value={form.neighborhood} onChange={(event) => onChange('neighborhood', event.target.value)} placeholder="Digite o bairro" required />
          </label>

          <label className="field">
            <span>Número</span>
            <input type="number" value={form.number} onChange={(event) => onChange('number', event.target.value)} placeholder="Digite o número" min="1" required />
          </label>

          <label className="field">
            <span>Complemento</span>
            <input type="text" value={form.complement} onChange={(event) => onChange('complement', event.target.value)} placeholder="Complemento opcional" />
          </label>
        </div>
      </section>

      <section className="modal-section">
        <div className="modal-section__header">
          <span className="panel__eyebrow">Observações</span>
          <p className="panel__copy">Observações gerais.</p>
        </div>

        <label className="field">
          <span>Comentários</span>
          <textarea className="textarea-field" value={form.comments} onChange={(event) => onChange('comments', event.target.value)} placeholder="Observações iniciais da obra" rows={4} />
        </label>
      </section>
    </>
  )
}
