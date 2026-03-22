const TOKEN_KEY = "admin_auth_token";

let inMemoryToken: string | null = null;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function safeGetSessionItem(key: string): string | null {
  if (!isBrowser()) return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetSessionItem(key: string, value: string): void {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    return;
  }
}

function safeRemoveSessionItem(key: string): void {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    return;
  }
}

function isLikelyJwt(token: string): boolean {
  return /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(token);
}

function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const payload = token.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "="));
    return JSON.parse(json) as { exp?: number };
  } catch {
    return null;
  }
}

function isExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;
  return Date.now() >= payload.exp * 1000;
}

export function getAdminToken(): string | null {
  const token = inMemoryToken ?? safeGetSessionItem(TOKEN_KEY);
  if (!token || !isLikelyJwt(token) || isExpired(token)) {
    clearAdminSession();
    return null;
  }

  inMemoryToken = token;
  return token;
}

export function isAdminAuthenticated(): boolean {
  return Boolean(getAdminToken());
}

export function setAdminSession(token: string): boolean {
  const trimmedToken = token.trim();
  if (!trimmedToken || !isLikelyJwt(trimmedToken)) return false;

  inMemoryToken = trimmedToken;
  safeSetSessionItem(TOKEN_KEY, trimmedToken);
  return true;
}

export function clearAdminSession(): void {
  inMemoryToken = null;
  safeRemoveSessionItem(TOKEN_KEY);
}
