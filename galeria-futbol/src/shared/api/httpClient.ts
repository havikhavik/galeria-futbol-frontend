const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined

if (!rawApiBaseUrl) {
  throw new Error('Missing VITE_API_BASE_URL. Set it in your .env file.')
}

const apiBaseUrl = rawApiBaseUrl.trim().replace(/\/+$/, '').replace(/\.$/, '')

export const httpClient = {
  baseUrl: apiBaseUrl,
  buildUrl: (path: string) => `${apiBaseUrl}/${path.replace(/^\/+/, '')}`,
  getJson: async <T>(path: string): Promise<T> => {
    const response = await fetch(`${apiBaseUrl}/${path.replace(/^\/+/, '')}`)
    if (!response.ok) {
      throw new Error(`GET ${path} failed: ${response.status}`)
    }
    return (await response.json()) as T
  },
}
