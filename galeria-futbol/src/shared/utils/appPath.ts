const BASE_PREFIX =
  (((import.meta.env.BASE_URL as string | undefined) ?? "/").replace(/\/+$/, "")) || "";

export function toAppPath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return !BASE_PREFIX
    ? normalized
    : normalized === "/"
      ? `${BASE_PREFIX}/`
      : `${BASE_PREFIX}${normalized}`;
}

export function getAppPathname(pathname: string): string {
  if (!BASE_PREFIX) return pathname || "/";
  if (pathname === BASE_PREFIX || pathname === `${BASE_PREFIX}/`) return "/";
  return pathname.startsWith(`${BASE_PREFIX}/`)
    ? pathname.slice(BASE_PREFIX.length)
    : pathname || "/";
}
