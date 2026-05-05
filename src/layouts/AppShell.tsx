import { Boxes, ChevronLeft, ChevronRight, HardHat, MapPinned, Menu, ShieldUser, Users, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { type AppRole, useAuth } from '../features/auth/AuthContext'

const navigationItems = [
  { to: '/obras', label: 'Obras', icon: MapPinned, enabled: true, roles: ['ADMIN', 'MANAGER', 'USER'] as AppRole[] },
  { to: '/clientes', label: 'Clientes', icon: ShieldUser, enabled: true, roles: ['ADMIN', 'MANAGER'] as AppRole[] },
  { to: '/equipe', label: 'Equipe', icon: Users, enabled: true, roles: ['ADMIN', 'MANAGER'] as AppRole[] },
  { to: '/estoque', label: 'Estoque', icon: Boxes, enabled: true, roles: ['ADMIN', 'MANAGER', 'USER'] as AppRole[] },
]

export function AppShell() {
  const { logout, user } = useAuth()
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
      : location.pathname.startsWith('/estoque')
        ? 'Estoque'
      : 'Quali'
  const userName = user?.name?.trim() || 'Usuário'
  const userRole = formatRoleLabel(user?.role)
  const userInitials = buildInitials(userName)
  const visibleNavigationItems = navigationItems.filter((item) => !item.roles || (user?.role ? item.roles.includes(user.role) : false))
  const topbarHint = buildTopbarHint(location.pathname, user?.role)

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
              <span>Gestão da qualidade</span>
            </div>
          </div>

          <div className="shell__nav-wrap">
            <div className="shell__nav-header">
              <p className="eyebrow">Navegação</p>
              <p className="shell__copy">Acesso rápido aos módulos principais do sistema.</p>
            </div>

            <nav className="shell__nav" aria-label="Principal">
              {visibleNavigationItems.map((item) => (
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
            <div className="shell__user-avatar">{userInitials}</div>
            <div>
              <strong>{userName}</strong>
              <span>{userRole}</span>
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
            <div className="topbar__context-card" aria-label="Contexto da tela">
              <strong>{userRole}</strong>
              <span>{topbarHint}</span>
            </div>
          </div>
        </header>

        <Outlet />
      </main>
    </div>
  )
}

function buildInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'U'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
}

function formatRoleLabel(role: 'ADMIN' | 'MANAGER' | 'USER' | null | undefined) {
  if (role === 'ADMIN') return 'Administrador(a)'
  if (role === 'MANAGER') return 'Gestor(a)'
  if (role === 'USER') return 'Colaborador(a)'
  return 'Usuário do sistema'
}

function buildTopbarHint(pathname: string, role: AppRole | null | undefined) {
  if (pathname.startsWith('/obras/') && role === 'USER') return 'Acesso liberado apenas às obras em que você participa.'
  if (pathname.startsWith('/obras/')) return 'Acompanhe prazo, equipe, materiais, fotos e checklist da obra.'
  if (pathname.startsWith('/obras')) return role === 'USER' ? 'Painel restrito às obras da sua equipe.' : 'Painel executivo com filtros, status e atalhos da operação.'
  if (pathname.startsWith('/clientes')) return 'Base ativa de clientes para cadastro, edição e arquivamento.'
  if (pathname.startsWith('/equipe')) return role === 'ADMIN' ? 'Gerencie colaboradores e perfis de acesso do sistema.' : 'Acompanhe colaboradores ativos e gerencie a operação da equipe.'
  if (pathname.startsWith('/estoque')) return role === 'USER' ? 'Consulta do estoque global da empresa.' : 'Cadastre itens e registre entradas e saídas do estoque global.'
  return 'Painel principal do sistema.'
}
