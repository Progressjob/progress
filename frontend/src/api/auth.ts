import { apiFetch } from './client';
import type { AuthMeResponse, Company, TokenResponse } from '../types/api';

export interface EnableEmployerInput {
  name: string;
  city?: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  description?: string;
  logoFileId: string;
  businessLicenceFileId: string;
  companySize?: string;
}

export interface EnableEmployerResponse {
  company: Company;
  created: boolean;
}

export const authApi = {
  loginWithGoogle: (idToken: string) =>
    apiFetch<TokenResponse>('/auth/google', { method: 'POST', body: { idToken }, skipAuth: true }),
  enableCandidate: () => apiFetch<AuthMeResponse>('/auth/enable-candidate', { method: 'POST' }),
  enableEmployer: (payload: EnableEmployerInput) =>
    apiFetch<EnableEmployerResponse>('/auth/enable-employer', { method: 'POST', body: payload }),
};
