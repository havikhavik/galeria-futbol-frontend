export const routes = {
  home: '/',
  discovery: '/discovery',
  search: '/search',
  albumDetail: '/albums/:id',
  admin: '/admin',
  adminLogin: '/login',
} as const

const rawBase = (import.meta.env.BASE_URL as string | undefined) ?? '/'
const basePrefix = rawBase === '/' ? '' : rawBase.replace(/\/+$/, '')

export function toAppPath(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  if (!basePrefix) {
    return normalized
  }

  return normalized === '/' ? `${basePrefix}/` : `${basePrefix}${normalized}`
}

export function getAppPathname(pathname: string): string {
  if (!basePrefix) {
    return pathname || '/'
  }

  if (pathname === basePrefix || pathname === `${basePrefix}/`) {
    return '/'
  }

  if (pathname.startsWith(`${basePrefix}/`)) {
    return pathname.slice(basePrefix.length)
  }

  return pathname || '/'
}
