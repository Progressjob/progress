import type { TokenResponse } from '../types/api';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://localhost:3000/api/v1';

const ACCESS_KEY = 'ej_access_token';
const REFRESH_KEY = 'ej_refresh_token';
const EXPIRES_KEY = 'ej_expires_at';

export function getStoredTokens(): { accessToken: string | null; refreshToken: string | null } {
  return {
    accessToken: localStorage.getItem(ACCESS_KEY),
    refreshToken: localStorage.getItem(REFRESH_KEY),
  };
}

export function setStoredTokens(tokens: TokenResponse): void {
  localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  localStorage.setItem(EXPIRES_KEY, tokens.expiresAt);
}

export function clearStoredTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(EXPIRES_KEY);
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
      clearStoredTokens();
      return null;
    }
    const tokens = (await res.json()) as TokenResponse;
    setStoredTokens(tokens);
    return tokens.accessToken;
  } catch {
    clearStoredTokens();
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
    normalizedPath.startsWith('/auth/refresh');

  if (res.status === 401 && !options.skipAuth && !isAuthEndpoint) {
    const newAccess = await refreshAccessTokenSingleFlight();
    if (newAccess) {
      res = await fetch(url, {
        ...options,
        headers: buildHeaders(newAccess),
        body: serializeBody(),
      });
    } else {
      clearStoredTokens();
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
