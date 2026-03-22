import { clearAdminSession, getAdminToken } from "../auth/adminSession"
import { getAppPathname, toAppPath } from "../utils/appPath"
import type { ApiErrorPayload, HttpClientError } from "../types/common"

const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined

if (!rawApiBaseUrl) {
  throw new Error('Missing VITE_API_BASE_URL. Set it in your .env file.')
}

const normalizedRemoteApiBaseUrl = rawApiBaseUrl.trim().replace(/\/+$/, '').replace(/\.$/, '')
const apiBaseUrl = import.meta.env.DEV ? '/api' : normalizedRemoteApiBaseUrl

export type { HttpClientError } from "../types/common"

function buildHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra)
  return headers
}

function shouldAttachAuth(normalizedPath: string): boolean {
  return normalizedPath.startsWith('admin/') || normalizedPath === 'auth/me'
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
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: object,
): Promise<T> {
  const normalizedPath = path.replace(/^\/+/, '')
  const headers = buildHeaders(body ? { 'Content-Type': 'application/json' } : undefined)
  if (shouldAttachAuth(normalizedPath)) {
    const token = getAdminToken()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  const response = await fetch(`${apiBaseUrl}/${path.replace(/^\/+/, '')}`, {
    method,
    credentials: 'omit',
    headers,
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

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export const httpClient = {
  baseUrl: apiBaseUrl,
  buildUrl: (path: string) => `${apiBaseUrl}/${path.replace(/^\/+/, '')}`,
  getJson: <T>(path: string): Promise<T> => requestJson<T>('GET', path),
  postJson: <TResponse, TBody extends object>(path: string, body: TBody): Promise<TResponse> =>
    requestJson<TResponse>('POST', path, body),
  putJson: <TResponse, TBody extends object>(path: string, body: TBody): Promise<TResponse> =>
    requestJson<TResponse>('PUT', path, body),
  patchJson: <TResponse, TBody extends object>(path: string, body: TBody): Promise<TResponse> =>
    requestJson<TResponse>('PATCH', path, body),
  deleteJson: <T>(path: string): Promise<T> => requestJson<T>('DELETE', path),
}
