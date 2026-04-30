import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { type AppRole, useAuth } from '../features/auth/AuthContext'

type ProtectedRouteProps = {
  children: ReactNode
  allowedRoles?: AppRole[]
  deniedMessage?: string
  redirectTo?: string
}

const APP_TOAST_EVENT = 'quali:auth-toast'

export function ProtectedRoute({ children, allowedRoles, deniedMessage = 'Você não pode acessar esta tela.', redirectTo = '/obras' }: ProtectedRouteProps) {
  const { token, user } = useAuth()
  const location = useLocation()

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (allowedRoles?.length && (!user?.role || !allowedRoles.includes(user.role))) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(APP_TOAST_EVENT, {
          detail: {
            variant: 'error',
            message: deniedMessage,
          },
        }),
      )
    }

    return <Navigate to={redirectTo} replace state={{ from: location }} />
  }

  return <>{children}</>
}
