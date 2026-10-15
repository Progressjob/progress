import { apiFetch } from './client';
import type { Application, ApplicationStatus, Company, Job } from '../types/api';

export const employerApi = {
  listCompanies: () => apiFetch<Company[]>('/employer/companies'),
  getCompany: (companyId: string) =>
    apiFetch<Company>(`/employer/companies/${companyId}`),
  listJobs: (companyId: string) =>
    apiFetch<Job[]>(`/employer/companies/${companyId}/jobs`),
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
};
