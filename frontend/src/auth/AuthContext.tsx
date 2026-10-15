import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  apiFetch,
  clearStoredTokens,
  getStoredTokens,
  setOnUnauthorized,
  setStoredTokens,
} from '../api/client';
import type { AuthMeResponse, TokenResponse } from '../types/api';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  candidateProfileId: string | null;
  companyMemberships: Array<{ companyId: string; memberRole: string }>;
}

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
  hasRole: (...roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function normalizeMe(raw: AuthMeResponse): AuthUser {
  return {
    id: raw.id,
    email: raw.email,
    firstName: raw.firstName,
    lastName: raw.lastName,
    roles: raw.roles.map((r) => r.role.name),
    candidateProfileId: raw.candidateProfile?.id ?? null,
    companyMemberships: raw.companyMemberships ?? [],
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async (): Promise<AuthUser | null> => {
    const { accessToken, refreshToken } = getStoredTokens();
    if (!accessToken && !refreshToken) {
      setUser(null);
      return null;
    }
    try {
      const me = await apiFetch<AuthMeResponse>('/auth/me');
      const normalized = normalizeMe(me);
      setUser(normalized);
      return normalized;
    } catch {
      clearStoredTokens();
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    setOnUnauthorized(() => {
      setUser(null);
    });
    void refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const login = useCallback(
    async (identifier: string, password: string): Promise<AuthUser> => {
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
    [refreshUser],
  );

  const register = useCallback(
    async (input: RegisterInput): Promise<AuthUser> => {
      const payload = {
        email: input.email,
        password: input.password,
        firstName: input.firstName,
        lastName: input.lastName,
        ...(input.phone?.trim() ? { phone: input.phone.trim() } : {}),
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
    [refreshUser],
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
    setUser(null);
  }, []);

  const hasRole = useCallback(
    (...roles: string[]) => {
      if (!user) return false;
      return roles.some((role) => user.roles.includes(role));
    },
    [user],
  );

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, refreshUser, hasRole }}
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
