import { apiFetch } from './client';
import type { Company } from '../types/api';

export const companiesApi = {
  list: (page = 1, limit = 20, filters?: { industryId?: string; excludeId?: string }) => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (filters?.industryId) params.set('industryId', filters.industryId);
    if (filters?.excludeId) params.set('excludeId', filters.excludeId);
    return apiFetch<Company[]>(`/companies?${params}`, { skipAuth: true });
  },
  detail: (slug: string) =>
    apiFetch<Company>(`/companies/${encodeURIComponent(slug)}`, { skipAuth: true }),
};
