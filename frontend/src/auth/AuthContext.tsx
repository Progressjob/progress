import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ApiError,
  apiFetch,
  clearStoredTokens,
  getStoredTokens,
  getStoredUserSnapshot,
  hasStoredSession,
  setOnUnauthorized,
  setStoredTokens,
  setStoredUserSnapshot,
} from '../api/client';
import { authApi, type EnableEmployerInput, type EnableEmployerResponse } from '../api/auth';
import type { AuthMeResponse, TokenResponse } from '../types/api';
import {
  getStoredWorkspace,
  resolveWorkspace,
  setStoredWorkspace,
  type Workspace,
} from './workspace';

export interface AuthUser {
  id: string;
  email: string;
  phone?: string | null;
  firstName: string;
  lastName: string;
  roles: string[];
  candidateProfileId: string | null;
  applicationsBlocked: boolean;
  accountStatus: string;
  companyMemberships: Array<{ companyId: string; memberRole: string }>;
}

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  /** True while tokens exist and /auth/me has not finished confirming the session. */
  restoringSession: boolean;
  workspace: Workspace;
  setWorkspace: (workspace: Workspace) => void;
  login: (identifier: string, password: string) => Promise<AuthUser>;
  loginWithGoogle: (idToken: string) => Promise<{ user: AuthUser; isNew: boolean }>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
  enableCandidate: () => Promise<AuthUser | null>;
  enableEmployer: (input: EnableEmployerInput) => Promise<EnableEmployerResponse>;
  hasRole: (...roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Survives React StrictMode remounts so session restore + token refresh run once. */
let bootstrapPromise: Promise<AuthUser | null> | null = null;

function isAuthUserSnapshot(value: unknown): value is AuthUser {
  if (!value || typeof value !== 'object') return false;
  const u = value as Partial<AuthUser>;
  return (
    typeof u.id === 'string' &&
    typeof u.email === 'string' &&
    typeof u.firstName === 'string' &&
    typeof u.lastName === 'string' &&
    Array.isArray(u.roles)
  );
}

function readOptimisticUser(): AuthUser | null {
  if (!hasStoredSession()) return null;
  const snap = getStoredUserSnapshot<AuthUser>();
  return isAuthUserSnapshot(snap) ? snap : null;
}

function normalizeMe(raw: AuthMeResponse): AuthUser {
  return {
    id: raw.id,
    email: raw.email,
    firstName: raw.firstName,
    lastName: raw.lastName,
    phone: raw.phone ?? null,
    roles: raw.roles.map((r) => r.role.name),
    candidateProfileId: raw.candidateProfile?.id ?? null,
    applicationsBlocked: raw.candidateProfile?.applicationsBlocked ?? false,
    accountStatus: raw.accountStatus,
    companyMemberships: raw.companyMemberships ?? [],
  };
}

function applyAuthenticatedUser(
  normalized: AuthUser,
  setUser: (user: AuthUser) => void,
  setWorkspaceState: (workspace: Workspace) => void,
): AuthUser {
  const nextWorkspace = resolveWorkspace(normalized.roles, getStoredWorkspace());
  setUser(normalized);
  setWorkspaceState(nextWorkspace);
  setStoredWorkspace(nextWorkspace);
  setStoredUserSnapshot(normalized);
  return normalized;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(() => readOptimisticUser());
  const [loading, setLoading] = useState<boolean>(() => hasStoredSession());
  const [workspace, setWorkspaceState] = useState<Workspace>(
    () => getStoredWorkspace() ?? 'candidate',
  );

  const setWorkspace = useCallback((next: Workspace) => {
    setWorkspaceState(next);
    setStoredWorkspace(next);
  }, []);

  const refreshUser = useCallback(async (): Promise<AuthUser | null> => {
    const { accessToken, refreshToken } = getStoredTokens();
    if (!accessToken && !refreshToken) {
      setUser(null);
      return null;
    }
    try {
      const me = await apiFetch<AuthMeResponse>('/auth/me');
      return applyAuthenticatedUser(normalizeMe(me), setUser, setWorkspaceState);
    } catch (err) {
      const { accessToken: stillAccess, refreshToken: stillRefresh } = getStoredTokens();
      // Tokens already cleared by the API client ⇒ session is dead.
      if (!stillAccess && !stillRefresh) {
        setUser(null);
        return null;
      }
      // Keep tokens on transient failures (network/5xx, or 401 while refresh
      // token remains after a failed renew attempt) so reload can recover.
      if (err instanceof ApiError && err.status === 401 && !stillRefresh) {
        clearStoredTokens();
        setUser(null);
        return null;
      }
      throw err;
    }
  }, []);

  useEffect(() => {
    setOnUnauthorized(() => {
      clearStoredTokens();
      queryClient.clear();
      setUser(null);
      bootstrapPromise = null;
    });
    if (!hasStoredSession()) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    if (!bootstrapPromise) {
      bootstrapPromise = refreshUser().catch((err) => {
        bootstrapPromise = null;
        throw err;
      });
    }
    void bootstrapPromise
      .then((loaded) => {
        if (cancelled) return;
        if (loaded) {
          applyAuthenticatedUser(loaded, setUser, setWorkspaceState);
        } else if (!hasStoredSession()) {
          setUser(null);
        }
        // If tokens remain but loaded is null, keep optimistic snapshot user.
      })
      .catch(() => {
        // Transient bootstrap failure — keep optimistic user/tokens so refresh
        // does not look like a logout.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshUser, queryClient]);

  const login = useCallback(
    async (identifier: string, password: string): Promise<AuthUser> => {
      clearStoredTokens();
      bootstrapPromise = null;
      queryClient.clear();
      setUser(null);
      const tokens = await apiFetch<TokenResponse>('/auth/login', {
        method: 'POST',
        body: { identifier, password },
        skipAuth: true,
      });
      setStoredTokens(tokens);
      const loaded = await refreshUser();
      if (!loaded) throw new Error('Failed to load user profile after login');
      return loaded;
    },
    [refreshUser, queryClient],
  );

  const loginWithGoogle = useCallback(
    async (idToken: string): Promise<{ user: AuthUser; isNew: boolean }> => {
      clearStoredTokens();
      bootstrapPromise = null;
      queryClient.clear();
      setUser(null);
      const tokens = await authApi.loginWithGoogle(idToken);
      setStoredTokens(tokens);
      const loaded = await refreshUser();
      if (!loaded) throw new Error('Failed to load user profile after Google sign-in');
      return { user: loaded, isNew: Boolean(tokens.isNew) };
    },
    [refreshUser, queryClient],
  );

  const register = useCallback(
    async (input: RegisterInput): Promise<AuthUser> => {
      clearStoredTokens();
      bootstrapPromise = null;
      queryClient.clear();
      setUser(null);
      const payload = {
        email: input.email.trim(),
        password: input.password,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        phone: input.phone.trim(),
      };
      const tokens = await apiFetch<TokenResponse>('/auth/register', {
        method: 'POST',
        body: payload,
        skipAuth: true,
      });
      setStoredTokens(tokens);
      const loaded = await refreshUser();
      if (!loaded) throw new Error('Failed to load user profile after registration');
      return loaded;
    },
    [refreshUser, queryClient],
  );

  const enableCandidate = useCallback(async (): Promise<AuthUser | null> => {
    await authApi.enableCandidate();
    return refreshUser();
  }, [refreshUser]);

  const enableEmployer = useCallback(
    async (input: EnableEmployerInput): Promise<EnableEmployerResponse> => {
      const result = await authApi.enableEmployer(input);
      setWorkspace('employer');
      await refreshUser();
      return result;
    },
    [refreshUser, setWorkspace],
  );

  const logout = useCallback(async (): Promise<void> => {
    const { refreshToken } = getStoredTokens();
    if (refreshToken) {
      try {
        await apiFetch('/auth/logout', {
          method: 'POST',
          body: { refreshToken },
          skipAuth: true,
        });
      } catch {
        // Ignore logout network error
      }
    }
    clearStoredTokens();
    bootstrapPromise = null;
    queryClient.clear();
    setUser(null);
  }, [queryClient]);

  const hasRole = useCallback(
    (...roles: string[]) => {
      if (!user) return false;
      return roles.some((role) => user.roles.includes(role));
    },
    [user],
  );

  const restoringSession = loading && hasStoredSession();

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        restoringSession,
        workspace,
        setWorkspace,
        login,
        loginWithGoogle,
        register,
        logout,
        refreshUser,
        enableCandidate,
        enableEmployer,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
