import { apiFetch } from './client';
import type { AuthMeResponse, Company } from '../types/api';

export interface EnableEmployerInput {
  name: string;
  city?: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  description?: string;
}

export interface EnableEmployerResponse {
  company: Company;
  created: boolean;
}

export const authApi = {
  enableCandidate: () => apiFetch<AuthMeResponse>('/auth/enable-candidate', { method: 'POST' }),
  enableEmployer: (payload: EnableEmployerInput) =>
    apiFetch<EnableEmployerResponse>('/auth/enable-employer', { method: 'POST', body: payload }),
};
