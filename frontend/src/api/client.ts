import type { TokenResponse } from '../types/api';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api/v1';

const ACCESS_KEY = 'ej_access_token';
const REFRESH_KEY = 'ej_refresh_token';
const EXPIRES_KEY = 'ej_expires_at';
const USER_SNAPSHOT_KEY = 'ej_user_snapshot';

export function getStoredTokens(): { accessToken: string | null; refreshToken: string | null } {
  return {
    accessToken: localStorage.getItem(ACCESS_KEY),
    refreshToken: localStorage.getItem(REFRESH_KEY),
  };
}

export function hasStoredSession(): boolean {
  const { accessToken, refreshToken } = getStoredTokens();
  return Boolean(accessToken || refreshToken);
}

export function setStoredTokens(tokens: TokenResponse): void {
  localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  localStorage.setItem(EXPIRES_KEY, tokens.expiresAt);
}

/** Lightweight profile kept for instant signed-in UI on refresh (not a security boundary). */
export function getStoredUserSnapshot<T>(): T | null {
  try {
    const raw = localStorage.getItem(USER_SNAPSHOT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setStoredUserSnapshot(user: unknown): void {
  localStorage.setItem(USER_SNAPSHOT_KEY, JSON.stringify(user));
}

export function clearStoredUserSnapshot(): void {
  localStorage.removeItem(USER_SNAPSHOT_KEY);
}

export function clearStoredTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(EXPIRES_KEY);
  clearStoredUserSnapshot();
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('progress.workspace');
    localStorage.removeItem('progress.saved_jobs');
  }
}

export function clearAllUserSession(): void {
  clearStoredTokens();
}

export class ApiError extends Error {
  status: number;
  details: string[];

  constructor(status: number, message: string, details: string[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

let refreshPromise: Promise<string | null> | null = null;
let onUnauthorizedCallback: (() => void) | null = null;

export function setOnUnauthorized(cb: () => void): void {
  onUnauthorizedCallback = cb;
}

function clearTokensIfUnchanged(refreshToken: string): void {
  // A concurrent refresh may have already rotated and stored a new pair.
  // Only wipe the session if we still hold the token that just failed.
  if (getStoredTokens().refreshToken === refreshToken) {
    clearStoredTokens();
  }
}

async function performRefresh(): Promise<string | null> {
  const { refreshToken } = getStoredTokens();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      const latest = getStoredTokens();
      // Concurrent refresh may have already rotated successfully.
      if (latest.accessToken && latest.refreshToken && latest.refreshToken !== refreshToken) {
        return latest.accessToken;
      }
      // 401/403 = refresh token revoked/expired. Network/5xx must not log the user out.
      if (res.status === 401 || res.status === 403) {
        clearTokensIfUnchanged(refreshToken);
      }
      return null;
    }
    const tokens = (await res.json()) as TokenResponse;
    setStoredTokens(tokens);
    return tokens.accessToken;
  } catch {
    // Transient network / proxy failure — keep tokens so a reload can recover.
    return null;
  }
}

async function refreshAccessTokenSingleFlight(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function parseErrorResponse(res: Response): Promise<ApiError> {
  let body: { statusCode?: number; message?: string | string[]; error?: string } | null = null;
  try {
    body = (await res.json()) as { statusCode?: number; message?: string | string[]; error?: string };
  } catch {
    // Non-JSON error body
  }

  if (res.status === 429) {
    return new ApiError(429, 'Too many requests. Please wait a moment and try again.');
  }

  const rawMsg = body?.message;
  if (Array.isArray(rawMsg)) {
    return new ApiError(res.status, rawMsg.join('; '), rawMsg);
  }
  if (typeof rawMsg === 'string' && rawMsg.trim()) {
    return new ApiError(res.status, rawMsg, [rawMsg]);
  }
  return new ApiError(res.status, body?.error || `Request failed with status ${res.status}`);
}

export interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  skipAuth?: boolean;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${BASE_URL}${normalizedPath}`;
  const isFormData = options.body instanceof FormData;

  const buildHeaders = (token: string | null): HeadersInit => {
    const headers: Record<string, string> = {};
    if (!isFormData && options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    if (!options.skipAuth && token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (options.headers) {
      const extra = options.headers as Record<string, string>;
      for (const [k, v] of Object.entries(extra)) {
        if (v !== undefined) headers[k] = v;
      }
    }
    return headers;
  };

  const serializeBody = (): BodyInit | undefined => {
    if (options.body === undefined) return undefined;
    if (isFormData) return options.body as FormData;
    return JSON.stringify(options.body);
  };

  const { accessToken } = getStoredTokens();
  let res = await fetch(url, {
    ...options,
    headers: buildHeaders(accessToken),
    body: serializeBody(),
  });

  const isAuthEndpoint =
    normalizedPath.startsWith('/auth/login') ||
    normalizedPath.startsWith('/auth/register') ||
    normalizedPath.startsWith('/auth/google') ||
    normalizedPath.startsWith('/auth/refresh');

  if (res.status === 401 && !options.skipAuth && !isAuthEndpoint) {
    const newAccess = await refreshAccessTokenSingleFlight();
    if (newAccess) {
      res = await fetch(url, {
        ...options,
        headers: buildHeaders(newAccess),
        body: serializeBody(),
      });
    } else if (!getStoredTokens().refreshToken) {
      // Refresh definitively failed and cleared the session.
      onUnauthorizedCallback?.();
    }
  }

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export async function apiDownloadFile(fileId: string, filename = 'download'): Promise<void> {
  const { accessToken } = getStoredTokens();
  const url = `${BASE_URL}/files/${fileId}/download`;
  let res = await fetch(url, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });

  if (res.status === 401) {
    const newAccess = await refreshAccessTokenSingleFlight();
    if (newAccess) {
      res = await fetch(url, {
        headers: { Authorization: `Bearer ${newAccess}` },
      });
    }
  }

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function apiOpenFile(fileId: string): Promise<void> {
  const { accessToken } = getStoredTokens();
  const url = `${BASE_URL}/files/${fileId}/download`;
  let res = await fetch(url, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });

  if (res.status === 401) {
    const newAccess = await refreshAccessTokenSingleFlight();
    if (newAccess) {
      res = await fetch(url, {
        headers: { Authorization: `Bearer ${newAccess}` },
      });
    }
  }

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  window.open(objectUrl, '_blank', 'noopener,noreferrer');
}
