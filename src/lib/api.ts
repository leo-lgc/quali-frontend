import { clearStoredToken } from './storage'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'
const APP_TOAST_EVENT = 'quali:app-toast'

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

  let response: Response

  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      body: options.body,
      headers,
    })
  } catch {
    throw new ApiError('Não foi possível conectar ao servidor. Tente novamente em instantes.', 0)
  }

  if (!response.ok) {
    const message = await readErrorMessage(response)

    if (options.token && shouldForceLogout(response.status, message)) {
      clearStoredToken()

      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        dispatchAppToast('info', 'Sessão expirada. Faça login novamente.')
        window.location.replace('/login')
      }
    } else if (options.token && response.status === 403 && typeof window !== 'undefined') {
      dispatchAppToast('error', message || 'Você não tem permissão para acessar este recurso.')
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

function dispatchAppToast(variant: 'success' | 'error' | 'info', message: string) {
  window.dispatchEvent(
    new CustomEvent(APP_TOAST_EVENT, {
      detail: { variant, message },
    }),
  )
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
    return data.message ?? data.error ?? 'Não foi possível concluir a requisição.'
  }

  const text = await response.text()
  return text || 'Não foi possível concluir a requisição.'
}
