import { apiFetch } from './client';
import type { EmploymentType, Job, PaginatedResponse, WorkplaceType } from '../types/api';

export interface JobListParams {
  q?: string;
  category?: string;
  location?: string;
  company?: string;
  employment_type?: EmploymentType | '';
  career_level?: string;
  workplace_type?: WorkplaceType | '';
  page?: number;
  limit?: number;
}

const SESSION_KEY = 'ej_anon_session_id';

export function getAnonymousSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export interface FeaturedJobsResponse {
  data: Job[];
  personalized: boolean;
  reason: 'incomplete_profile' | 'no_matches' | null;
}

export const jobsApi = {
  recommendations: () => apiFetch<FeaturedJobsResponse>('/jobs/recommendations'),
  list: (params: JobListParams = {}) => {
    const search = new URLSearchParams();
    if (params.q?.trim()) search.set('q', params.q.trim());
    if (params.category) search.set('category', params.category);
    if (params.location) search.set('location', params.location);
    if (params.company) search.set('company', params.company);
    if (params.employment_type) search.set('employment_type', params.employment_type);
    if (params.career_level?.trim()) search.set('career_level', params.career_level.trim());
    if (params.workplace_type) search.set('workplace_type', params.workplace_type);
    search.set('page', String(params.page ?? 1));
    search.set('limit', String(params.limit ?? 20));

    const qs = search.toString();
    return apiFetch<PaginatedResponse<Job>>(`/jobs?${qs}`, { skipAuth: true });
  },

  detail: (slug: string, viewSource = 'search') =>
    apiFetch<Job>(`/jobs/${encodeURIComponent(slug)}`, {
      skipAuth: true,
      headers: {
        'x-session-id': getAnonymousSessionId(),
        'x-view-source': viewSource,
      },
    }),
};
