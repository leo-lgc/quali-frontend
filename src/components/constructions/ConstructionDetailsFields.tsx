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
  onChange: (field: keyof ConstructionFormState, value: string) => void
}

export function ConstructionDetailsFields({ form, clients, onChange }: ConstructionDetailsFieldsProps) {
  return (
    <div className="works-form__grid">
      <label className="field">
        <span>Nome da obra</span>
        <input type="text" value={form.name} onChange={(event) => onChange('name', event.target.value)} placeholder="Digite o nome da obra" required />
      </label>

      <label className="field">
        <span>Contato local</span>
        <input type="text" value={form.localContact} onChange={(event) => onChange('localContact', event.target.value)} placeholder="Digite o responsavel local" required />
      </label>

      <label className="field">
        <span>Cliente</span>
        <select className="select-field" value={form.clientId} onChange={(event) => onChange('clientId', event.target.value)} required>
          <option value="">Selecione um cliente</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>{client.name}</option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Prazo acordado</span>
        <input type="number" value={form.agreedDeadLine} onChange={(event) => onChange('agreedDeadLine', event.target.value)} placeholder="Quantidade de dias" min="1" required />
      </label>

      <label className="field">
        <span>Data de inicio</span>
        <input type="date" value={form.startDate} onChange={(event) => onChange('startDate', event.target.value)} required />
      </label>

      <label className="field">
        <span>Data de fim</span>
        <input type="date" value={form.endDate} onChange={(event) => onChange('endDate', event.target.value)} required />
      </label>
    </div>
  )
}
