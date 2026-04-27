import { Bell, ChevronLeft, ChevronRight, HardHat, MapPinned, Menu, Search, ShieldUser, Users, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'

const navigationItems = [
  { to: '/obras', label: 'Obras', icon: MapPinned, enabled: true },
  { to: '/clientes', label: 'Clientes', icon: ShieldUser, enabled: true },
  { to: '/equipe', label: 'Equipe', icon: Users, enabled: true },
]

export function AppShell() {
  const { logout } = useAuth()
  const location = useLocation()
  const [isDesktop, setIsDesktop] = useState(() => (typeof window === 'undefined' ? true : window.innerWidth > 1080))
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.innerWidth > 1080
  })

  useEffect(() => {
    function handleResize() {
      const nextIsDesktop = window.innerWidth > 1080
      setIsDesktop(nextIsDesktop)
      if (nextIsDesktop) {
        setIsSidebarOpen(true)
      } else {
        setIsSidebarOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (window.innerWidth <= 1080) {
      setIsSidebarOpen(false)
    }
  }, [location.pathname])

  const pageTitle = location.pathname.startsWith('/obras')
    ? 'Obras'
    : location.pathname.startsWith('/clientes')
      ? 'Clientes'
    : location.pathname.startsWith('/equipe')
        ? 'Equipe'
      : 'Quali'

  return (
    <div className={`shell ${isSidebarOpen ? 'shell--sidebar-open' : 'shell--sidebar-closed'}`.trim()}>
      {isSidebarOpen ? <button type="button" className="shell__backdrop" onClick={() => setIsSidebarOpen(false)} aria-label="Fechar menu" /> : null}

      <aside id="shell-sidebar" className={`shell__sidebar ${isSidebarOpen ? 'shell__sidebar--open' : ''}`.trim()}>
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
                    onClick={() => setIsSidebarOpen(window.innerWidth > 1080)}
                    className={({ isActive }) =>
                      isActive ? 'shell__link shell__link--active' : 'shell__link'
                    }
                  >
                    <item.icon size={18} />
                    <span className="shell__link-label">{item.label}</span>
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

          <button
            type="button"
            className="ghost-button"
            onClick={() => {
              setIsSidebarOpen(false)
              logout()
            }}
          >
            Sair
          </button>
        </div>
      </aside>

      <main className="shell__content">
        <header className="topbar">
          <div className="topbar__leading">
            <button
              type="button"
              className="icon-button shell__menu-toggle"
              onClick={() => setIsSidebarOpen((current) => !current)}
              aria-label={isSidebarOpen ? 'Fechar menu lateral' : 'Abrir menu lateral'}
              aria-expanded={isSidebarOpen}
              aria-controls="shell-sidebar"
            >
              {isDesktop ? (isSidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />) : isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

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
