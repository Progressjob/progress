import { apiFetch } from './client';
import type { Company } from '../types/api';

export const companiesApi = {
  list: (page = 1, limit = 20) =>
    apiFetch<Company[]>(`/companies?page=${page}&limit=${limit}`, { skipAuth: true }),
  detail: (slug: string) =>
    apiFetch<Company>(`/companies/${encodeURIComponent(slug)}`, { skipAuth: true }),
};
