import { clearStoredToken } from './storage'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'
const AUTH_TOAST_EVENT = 'quali:auth-toast'

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: BodyInit | null
  token?: string | null
  headers?: HeadersInit
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}) {
  const headers = new Headers(options.headers)

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`)
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    body: options.body,
    headers,
  })

  if (!response.ok) {
    const message = await readErrorMessage(response)

    if (options.token && shouldForceLogout(response.status, message)) {
      clearStoredToken()

      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.dispatchEvent(
          new CustomEvent(AUTH_TOAST_EVENT, {
            detail: {
              variant: 'info',
              message: 'Sessao expirada. Faca login novamente.',
            },
          }),
        )
        window.location.replace('/login')
      }
    }

    throw new ApiError(message, response.status)
  }

  if (response.status === 204) {
    return null as T
  }

  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    return (await response.json()) as T
  }

  return (await response.text()) as T
}

function shouldForceLogout(status: number, message: string) {
  if (status === 401) return true
  if (status !== 403) return false

  const normalizedMessage = message.toLowerCase()
  return (
    normalizedMessage.includes('jwt') ||
    normalizedMessage.includes('token') ||
    normalizedMessage.includes('expired') ||
    normalizedMessage.includes('assinado') ||
    normalizedMessage.includes('signature')
  )
}

async function readErrorMessage(response: Response) {
  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    const data = (await response.json()) as { message?: string; error?: string }
    return data.message ?? data.error ?? 'Nao foi possivel concluir a requisicao.'
  }

  const text = await response.text()
  return text || 'Nao foi possivel concluir a requisicao.'
}
