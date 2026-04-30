import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { apiRequest } from '../../lib/api'
import {
  clearStoredToken,
  getStoredToken,
  setStoredToken,
} from '../../lib/storage'

type LoginPayload = {
  email: string
  password: string
}

export type AppRole = 'ADMIN' | 'MANAGER' | 'USER'

type LoginResponse = {
  token: string
}

type AuthUser = {
  name: string
  email: string
  role: AppRole | null
}

type AuthContextValue = {
  token: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  login: (payload: LoginPayload) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

type AuthProviderProps = {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setToken] = useState<string | null>(() => {
    const storedToken = getStoredToken()

    if (!storedToken) return null

    if (isTokenExpired(storedToken)) {
      clearStoredToken()
      return null
    }

    return storedToken
  })
  const user = useMemo(() => (token ? parseUserFromToken(token) : null), [token])

  const login = useCallback(async ({ email, password }: LoginPayload) => {
    const response = await apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    setStoredToken(response.token)
    setToken(response.token)
  }, [])

  const logout = useCallback(() => {
    clearStoredToken()
    setToken(null)
  }, [])

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      login,
      logout,
    }),
    [login, logout, token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function parseUserFromToken(token: string): AuthUser | null {
  try {
    const [, payloadPart] = token.split('.')
    if (!payloadPart) return null

    const payloadJson = atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/'))
    const payload = JSON.parse(payloadJson) as {
      sub?: string
      name?: string
      role?: 'ADMIN' | 'MANAGER' | 'USER'
    }

    return {
      name: payload.name || payload.sub || 'Usuário',
      email: payload.sub || '',
      role: payload.role ?? null,
    }
  } catch {
    return null
  }
}

function isTokenExpired(token: string) {
  try {
    const [, payloadPart] = token.split('.')
    if (!payloadPart) return true

    const payloadJson = atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/'))
    const payload = JSON.parse(payloadJson) as { exp?: number }

    if (!payload.exp) return false

    const nowInSeconds = Math.floor(Date.now() / 1000)
    return payload.exp <= nowInSeconds
  } catch {
    return true
  }
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth precisa ser usado dentro de AuthProvider.')
  }

  return context
}
