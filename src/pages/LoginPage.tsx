import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../lib/api'
import { useAuth } from '../features/auth/AuthContext'

type LocationState = {
  from?: {
    pathname?: string
  }
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const state = location.state as LocationState | null
  const redirectTo = state?.from?.pathname || '/obras'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await login({ email, password })
      navigate(redirectTo, { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else if (err instanceof TypeError) {
        setError('Não foi possível conectar ao backend. Verifique se o backend está rodando e liberando CORS.')
      } else {
        setError('Não foi possível entrar agora. Tente novamente.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <section className="login-panel login-panel--brand">
        <div className="brand-lockup">
          <div className="brand-lockup__mark">Q</div>
          <div>
            <p className="eyebrow">Quali Platform</p>
            <h1 className="hero-title">Entre e acompanhe a obra com clareza.</h1>
          </div>
        </div>

        <p className="hero-copy hero-copy--wide">
          Acesso rápido ao sistema.
        </p>

        <div className="hero-grid hero-grid--stacked">
          <article className="info-card info-card--soft">
            <span className="info-card__value">Checklist técnico</span>
            <p>Checklist por obra.</p>
          </article>
          <article className="info-card info-card--soft">
            <span className="info-card__value">Fotos e materiais</span>
            <p>Registros e controle.</p>
          </article>
        </div>

        <div className="login-preview-card">
          <div className="login-preview-card__top">
            <span className="preview-dot"></span>
            <span className="preview-dot"></span>
            <span className="preview-dot"></span>
          </div>
          <div className="login-preview-card__body">
            <div className="preview-stat preview-stat--primary">
              <strong>12</strong>
              <span>obras monitoradas</span>
            </div>
            <div className="preview-columns">
              <div className="preview-column preview-column--blue"></div>
              <div className="preview-column preview-column--sand"></div>
              <div className="preview-column preview-column--green"></div>
            </div>
          </div>
        </div>
      </section>

      <section className="login-panel login-panel--form">
        <div className="auth-card">
          <div>
            <p className="eyebrow">Acesso seguro</p>
            <h2 className="section-title">Entrar no painel</h2>
            <p className="section-copy">Informe suas credenciais.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Digite seu email"
                autoComplete="email"
                required
              />
            </label>

            <label className="field">
              <span>Senha</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Digite sua senha de acesso"
                autoComplete="current-password"
                required
              />
            </label>

            {error ? <p className="form-error">{error}</p> : null}

            <button type="submit" className="primary-button" disabled={isSubmitting}>
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="auth-footer-copy">Ambiente local para validacao inicial das telas do frontend.</p>
        </div>
      </section>
    </div>
  )
}
