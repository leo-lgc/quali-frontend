import { Bell, HardHat, MapPinned, Search, ShieldUser, Users } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'

const navigationItems = [
  { to: '/obras', label: 'Obras', icon: MapPinned, enabled: true },
  { to: '/clientes', label: 'Clientes', icon: ShieldUser, enabled: true },
  { to: '#', label: 'Equipe', icon: Users, enabled: false },
]

export function AppShell() {
  const { logout } = useAuth()
  const location = useLocation()

  const pageTitle = location.pathname.startsWith('/obras')
    ? 'Obras'
    : location.pathname.startsWith('/clientes')
      ? 'Clientes'
      : 'Quali'

  return (
    <div className="shell">
      <aside className="shell__sidebar">
        <div className="shell__sidebar-top">
          <div className="shell__brand">
            <div className="shell__brand-mark">
              <HardHat size={22} />
            </div>
            <div className="shell__brand-copy">
              <strong>Quali</strong>
              <span>Gestao da qualidade</span>
            </div>
          </div>

          <div className="shell__nav-wrap">
            <div className="shell__nav-header">
              <p className="eyebrow">Navegacao</p>
              <p className="shell__copy">Acesso rapido aos modulos principais do sistema.</p>
            </div>

            <nav className="shell__nav" aria-label="Principal">
              {navigationItems.map((item) => (
                item.enabled ? (
                  <NavLink
                    key={item.label}
                    to={item.to}
                    className={({ isActive }) =>
                      isActive ? 'shell__link shell__link--active' : 'shell__link'
                    }
                  >
                    <item.icon size={18} />
                    {item.label}
                  </NavLink>
                ) : (
                  <div key={item.label} className="shell__link shell__link--disabled" aria-disabled="true">
                    <item.icon size={18} />
                    <span>{item.label}</span>
                    <small>Em breve</small>
                  </div>
                )
              ))}
            </nav>
          </div>
        </div>

        <div className="shell__sidebar-bottom">
          <div className="shell__user-card">
            <div className="shell__user-avatar">QT</div>
            <div>
              <strong>Quali Teste</strong>
              <span>Administradora</span>
            </div>
          </div>

          <button type="button" className="ghost-button" onClick={logout}>
            Sair
          </button>
        </div>
      </aside>

      <main className="shell__content">
        <header className="topbar">
          <div className="topbar__leading">
            <div>
              <span className="eyebrow">Painel administrativo</span>
              <h1>{pageTitle}</h1>
            </div>
          </div>

          <div className="topbar__actions">
            <label className="search-box" aria-label="Buscar no sistema">
              <Search size={18} />
              <input type="text" placeholder="Buscar" />
            </label>

            <button className="icon-button" aria-label="Notificacoes" type="button">
              <Bell size={18} />
            </button>
          </div>
        </header>

        <Outlet />
      </main>
    </div>
  )
}
