import { apiFetch } from './client';
import type { TalentSearchResponse, TalentSpotlightResponse } from '../types/api';

export const talentApi = {
  spotlight: () => apiFetch<TalentSpotlightResponse>('/talent/spotlight'),
  search: (params: { q: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params.q.trim()) qs.set('q', params.q.trim());
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    const query = qs.toString();
    return apiFetch<TalentSearchResponse>(`/talent${query ? `?${query}` : ''}`);
  },
};
