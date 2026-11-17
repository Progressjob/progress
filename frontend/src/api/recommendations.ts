import { apiFetch } from './client';
import type { OfficeRecommendationRegistry, TalentDetail } from '../types/api';

export interface RecommendationCard {
  id: string;
  status: 'sent' | 'viewed' | 'interested' | 'declined';
  note: string | null;
  employerResponse: string | null;
  createdAt: string;
  viewedAt: string | null;
  respondedAt: string | null;
  candidate: {
    id: string;
    headline: string | null;
    city: string | null;
    source: 'online' | 'office';
    user: { firstName: string; lastName: string };
  };
  company: { id: string; name: string };
  job: { id: string; title: string } | null;
  recommendedBy: { firstName: string; lastName: string };
}

export interface RecommendationDetail extends RecommendationCard {
  profile: TalentDetail;
  registry: OfficeRecommendationRegistry | null;
}

export const recommendationsApi = {
  create: (body: { candidateId: string; companyId: string; jobId?: string; note?: string }) =>
    apiFetch<RecommendationCard>('/admin/recommendations', { method: 'POST', body }),
  listForCandidate: (candidateId: string) =>
    apiFetch<RecommendationCard[]>(`/admin/recommendations?candidateId=${candidateId}`),
  employerList: (companyId: string) =>
    apiFetch<RecommendationCard[]>(`/employer/companies/${companyId}/recommendations`),
  employerDetail: (companyId: string, id: string) =>
    apiFetch<RecommendationDetail>(`/employer/companies/${companyId}/recommendations/${id}`),
  respond: (companyId: string, id: string, body: { status: 'interested' | 'declined'; message?: string }) =>
    apiFetch<RecommendationCard>(`/employer/companies/${companyId}/recommendations/${id}/respond`, {
      method: 'PATCH',
      body,
    }),
};
