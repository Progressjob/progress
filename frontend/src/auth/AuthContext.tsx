import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  apiFetch,
  clearStoredTokens,
  getStoredTokens,
  setOnUnauthorized,
  setStoredTokens,
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
  workspace: Workspace;
  setWorkspace: (workspace: Workspace) => void;
  login: (identifier: string, password: string) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
  enableCandidate: () => Promise<AuthUser | null>;
  enableEmployer: (input: EnableEmployerInput) => Promise<EnableEmployerResponse>;
  hasRole: (...roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
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
      const normalized = normalizeMe(me);
      const nextWorkspace = resolveWorkspace(normalized.roles, getStoredWorkspace());
      setUser(normalized);
      setWorkspaceState(nextWorkspace);
      setStoredWorkspace(nextWorkspace);
      return normalized;
    } catch {
      clearStoredTokens();
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    setOnUnauthorized(() => {
      clearStoredTokens();
      queryClient.clear();
      setUser(null);
    });
    void refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const login = useCallback(
    async (identifier: string, password: string): Promise<AuthUser> => {
      clearStoredTokens();
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

  const register = useCallback(
    async (input: RegisterInput): Promise<AuthUser> => {
      clearStoredTokens();
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

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        workspace,
        setWorkspace,
        login,
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
