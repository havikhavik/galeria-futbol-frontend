import { clearAdminSession, getAdminToken } from "../auth/adminSession"
import { getAppPathname, toAppPath } from "../utils/appPath"

const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined

if (!rawApiBaseUrl) {
  throw new Error('Missing VITE_API_BASE_URL. Set it in your .env file.')
}

const apiBaseUrl = rawApiBaseUrl.trim().replace(/\/+$/, '').replace(/\.$/, '')

type ApiErrorPayload = {
  message?: string
  errors?: string[]
}

export type HttpClientError = Error & {
  status?: number
  detail?: string
}

function buildHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra)
  const token = getAdminToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return headers
}

function redirectToLogin(): void {
  if (typeof window === 'undefined') return

  const currentPath = getAppPathname(window.location.pathname)
  const target = new URL(window.location.href)
  target.pathname = toAppPath('/login')
  target.search = ''
  if (currentPath !== '/login') {
    target.searchParams.set('next', currentPath)
  }
  window.location.replace(target.toString())
}

async function requestJson<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: object,
): Promise<T> {
  const normalizedPath = path.replace(/^\/+/, '')
  const response = await fetch(`${apiBaseUrl}/${path.replace(/^\/+/, '')}`, {
    method,
    credentials: 'omit',
    headers: buildHeaders(body ? { 'Content-Type': 'application/json' } : undefined),
    body: body ? JSON.stringify(body) : undefined,
  })

  // Security: on unauthorized protected calls, clear local auth state and force re-login.
  if (response.status === 401 && !normalizedPath.startsWith('auth/login') && getAdminToken()) {
    clearAdminSession()
    redirectToLogin()
  }

  if (!response.ok) {
    let detail = ''
    try {
      const payload = (await response.json()) as ApiErrorPayload
      detail = payload.errors?.[0] ?? payload.message ?? ''
    } catch {
      detail = ''
    }
    const error = new Error(
      `${method} ${path} failed: ${response.status}${detail ? ` - ${detail}` : ''}`,
    ) as HttpClientError
    error.status = response.status
    error.detail = detail || undefined
    throw error
  }

  return (await response.json()) as T
}

export const httpClient = {
  baseUrl: apiBaseUrl,
  buildUrl: (path: string) => `${apiBaseUrl}/${path.replace(/^\/+/, '')}`,
  getJson: <T>(path: string): Promise<T> => requestJson<T>('GET', path),
  postJson: <TResponse, TBody extends object>(path: string, body: TBody): Promise<TResponse> =>
    requestJson<TResponse>('POST', path, body),
}
