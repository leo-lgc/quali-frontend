type ClientFormState = {
  name: string
  email: string
  phone: string
}

type ClientFormFieldsProps = {
  form: ClientFormState
  onChange: (field: keyof ClientFormState, value: string) => void
}

export function ClientFormFields({ form, onChange }: ClientFormFieldsProps) {
  return (
    <>
      <label className="field">
        <span>Nome</span>
        <input
          type="text"
          value={form.name}
          onChange={(event) => onChange('name', event.target.value)}
          placeholder="Digite o nome do cliente"
          required
        />
      </label>

      <label className="field">
        <span>Email</span>
        <input
          type="email"
          value={form.email}
          onChange={(event) => onChange('email', event.target.value)}
          placeholder="Digite o email do cliente"
          required
        />
      </label>

      <label className="field field--full">
        <span>Telefone</span>
        <input
          type="text"
          value={form.phone}
          onChange={(event) => onChange('phone', event.target.value)}
          placeholder="(00)0 0000-0000"
          required
        />
      </label>
    </>
  )
}
