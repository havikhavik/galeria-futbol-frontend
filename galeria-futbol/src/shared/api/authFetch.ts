import { clearAdminSession, getAdminToken } from "../auth/adminSession"
import type { ApiErrorPayload, HttpClientError } from "../types/common"
import { getAppPathname, toAppPath } from "../utils/appPath"

function redirectToLogin(): void {
  if (typeof window === "undefined") return

  const currentPath = getAppPathname(window.location.pathname)
  const target = new URL(window.location.href)
  target.pathname = toAppPath("/login")
  target.search = ""
  if (currentPath !== "/login") {
    target.searchParams.set("next", currentPath)
  }
  window.location.replace(target.toString())
}

function applyAuthHeader(headers: Headers): Headers {
  const token = getAdminToken()
  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }
  return headers
}

function shouldForceLogin(input: RequestInfo | URL, response: Response): boolean {
  if (response.status !== 401) return false
  if (!getAdminToken()) return false

  const endpoint =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.pathname
        : input.url

  return !endpoint.includes("auth/login")
}

export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const headers = applyAuthHeader(new Headers(init.headers))
  const response = await fetch(input, {
    ...init,
    credentials: "omit",
    headers,
  })

  if (shouldForceLogin(input, response)) {
    clearAdminSession()
    redirectToLogin()
  }

  return response
}

export async function authFetchJson<T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<T> {
  const response = await authFetch(input, init)

  if (!response.ok) {
    let detail = ""
    try {
      const payload = (await response.json()) as ApiErrorPayload
      detail = payload.errors?.[0] ?? payload.message ?? ""
    } catch {
      detail = ""
    }

    const error = new Error(
      `Request failed: ${response.status}${detail ? ` - ${detail}` : ""}`,
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
