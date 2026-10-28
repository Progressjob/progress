import { apiFetch } from './client';
import type {
  Application,
  ApplicationMethod,
  ApplicationStatus,
  Company,
  EmploymentType,
  Job,
  TalentDetail,
  TalentSearchResponse,
  TalentSpotlightResponse,
  WorkplaceType,
} from '../types/api';

export interface CreateCompanyJobPayload {
  categoryId: string;
  locationId?: string;
  title: string;
  description: string;
  responsibilities?: string;
  requirements?: string;
  educationRequirement?: string;
  experienceMinYears?: number;
  employmentType: EmploymentType;
  workplaceType: WorkplaceType;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryVisibility?: boolean;
  applicationDeadline: string;
  vacanciesCount: number;
  applicationMethod: ApplicationMethod;
  applicationEmail?: string;
  applicationInstructions?: string;
}

export const employerApi = {
  listCompanies: () => apiFetch<Company[]>('/employer/companies'),
  getCompany: (companyId: string) =>
    apiFetch<Company>(`/employer/companies/${companyId}`),
  listJobs: (companyId: string) =>
    apiFetch<Job[]>(`/employer/companies/${companyId}/jobs`),
  createJob: (companyId: string, payload: CreateCompanyJobPayload) =>
    apiFetch<Job>(`/employer/companies/${companyId}/jobs`, { method: 'POST', body: payload }),
  getJob: (companyId: string, jobId: string) =>
    apiFetch<Job>(`/employer/companies/${companyId}/jobs/${jobId}`),
  updateJob: (companyId: string, jobId: string, payload: Partial<CreateCompanyJobPayload>) =>
    apiFetch<Job>(`/employer/companies/${companyId}/jobs/${jobId}`, {
      method: 'PATCH',
      body: payload,
    }),
  submitJob: (companyId: string, jobId: string) =>
    apiFetch<Job>(`/employer/companies/${companyId}/jobs/${jobId}/submit`, { method: 'POST' }),
  getJobStats: (companyId: string, jobId: string) =>
    apiFetch<{ views: number; applications: Array<{ status: ApplicationStatus; _count: number }> }>(
      `/employer/companies/${companyId}/jobs/${jobId}/stats`,
    ),
  listApplications: (
    companyId: string,
    jobId: string,
    params?: { status?: ApplicationStatus | ''; search?: string },
  ) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.search?.trim()) qs.set('search', params.search.trim());
    const query = qs.toString();
    return apiFetch<Application[]>(
      `/employer/companies/${companyId}/jobs/${jobId}/applications${query ? `?${query}` : ''}`,
    );
  },
  getApplication: (companyId: string, applicationId: string) =>
    apiFetch<Application>(`/employer/companies/${companyId}/applications/${applicationId}`),
  updateApplicationStatus: (
    companyId: string,
    applicationId: string,
    payload: { status: ApplicationStatus; note?: string },
  ) =>
    apiFetch<Application>(
      `/employer/companies/${companyId}/applications/${applicationId}/status`,
      {
        method: 'PATCH',
        body: payload,
      },
    ),
  talentSpotlight: (companyId: string) =>
    apiFetch<TalentSpotlightResponse>(`/employer/companies/${companyId}/talent/spotlight`),
  searchTalent: (companyId: string, params: { q?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params.q?.trim()) qs.set('q', params.q.trim());
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    const query = qs.toString();
    return apiFetch<TalentSearchResponse>(
      `/employer/companies/${companyId}/talent${query ? `?${query}` : ''}`,
    );
  },
  getTalent: (companyId: string, candidateId: string) =>
    apiFetch<TalentDetail>(`/employer/companies/${companyId}/talent/${candidateId}`),
};
