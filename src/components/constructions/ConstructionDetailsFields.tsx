type ClientOption = {
  id: number
  name: string
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

type ConstructionDetailsFieldsProps = {
  form: ConstructionFormState
  clients: ClientOption[]
  clientError?: string
  nameError?: string
  localContactError?: string
  startDateError?: string
  endDateError?: string
  onChange: (field: keyof ConstructionFormState, value: string) => void
}

export function ConstructionDetailsFields({ form, clients, clientError = '', nameError = '', localContactError = '', startDateError = '', endDateError = '', onChange }: ConstructionDetailsFieldsProps) {
  return (
    <div className="works-form__grid">
      <label className="field">
        <span>Nome da obra</span>
        <input type="text" value={form.name} onChange={(event) => onChange('name', event.target.value)} placeholder="Digite o nome da obra" className={nameError ? 'input-error' : undefined} required />
        {nameError ? <small className="field-help field-help--error field-help--inline-error">{nameError}</small> : null}
      </label>

      <label className="field">
        <span>Contato local</span>
        <input type="text" value={form.localContact} onChange={(event) => onChange('localContact', event.target.value)} placeholder="Digite o responsável local" className={localContactError ? 'input-error' : undefined} required />
        {localContactError ? <small className="field-help field-help--error field-help--inline-error">{localContactError}</small> : null}
      </label>

      <label className="field field--client-select">
        <span>Cliente</span>
        <select
          className={clientError ? 'select-field input-error' : 'select-field'}
          value={form.clientId}
          onChange={(event) => onChange('clientId', event.target.value)}
          aria-invalid={Boolean(clientError)}
          required
        >
          <option value="">Selecione um cliente</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>{client.name}</option>
          ))}
        </select>
        {clientError ? <small className="field-help field-help--error field-help--inline-error">{clientError}</small> : null}
      </label>

      <label className="field">
        <span>Prazo acordado</span>
        <input type="number" value={form.agreedDeadLine} onChange={(event) => onChange('agreedDeadLine', event.target.value)} placeholder="Quantidade de dias" min="1" required />
      </label>

      <label className="field">
        <span>Data de início</span>
        <input
          type="text"
          inputMode="numeric"
          value={form.startDate}
          onChange={(event) => onChange('startDate', formatDateMask(event.target.value))}
          placeholder="dd/mm/aaaa"
          className={startDateError ? 'input-error' : undefined}
          required
        />
        {startDateError ? <small className="field-help field-help--error field-help--inline-error">{startDateError}</small> : null}
      </label>

      <label className="field">
        <span>Data de fim</span>
        <input
          type="text"
          inputMode="numeric"
          value={form.endDate}
          onChange={(event) => onChange('endDate', formatDateMask(event.target.value))}
          placeholder="dd/mm/aaaa"
          className={endDateError ? 'input-error' : undefined}
          required
        />
        {endDateError ? <small className="field-help field-help--error field-help--inline-error">{endDateError}</small> : null}
      </label>
    </div>
  )
}

function formatDateMask(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}
