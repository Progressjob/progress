import { apiFetch } from './client';
import type {
  AdminCandidateUser,
  AdminDashboard,
  ApplicationMethod,
  Company,
  CompanyPortalStatus,
  EmploymentType,
  Job,
  QuestionType,
  WorkplaceType,
} from '../types/api';

export interface CompanyPayload {
  name: string;
  industryId?: string;
  description?: string;
  websiteUrl?: string;
  email?: string;
  phone?: string;
  country?: string;
  region?: string;
  city?: string;
  address?: string;
  contactPerson?: string;
  licenceNumber?: string;
  logoFileId?: string;
  companySize?: string;
  foundedYear?: number;
}

export interface CreateEmployerPayload {
  email: string;
  temporaryPassword: string;
}

export interface ProvisionCompanyPayload {
  company: CompanyPayload;
  employer: CreateEmployerPayload;
  verify?: boolean;
  canSelfPublishJobs?: boolean;
}

export interface ProvisionCompanyResponse {
  company: Company;
  member: {
    id: string;
    user: { id: string; email: string; firstName: string; lastName: string };
  };
  credentials: { email: string; temporaryPassword: string };
}

export interface CreateAdminJobPayload {
  companyId: string;
  categoryId: string;
  locationId?: string;
  title: string;
  /** Set from responsibility description on submit (backend requires `description`). */
  description?: string;
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
  applicationMethod?: ApplicationMethod;
  applicationEmail?: string;
  applicationInstructions?: string;
}

export interface ScreeningQuestionInput {
  questionText: string;
  questionType: QuestionType;
  isRequired?: boolean;
  sortOrder: number;
  options?: string[];
}

function withQuery(path: string, q?: string) {
  if (!q?.trim()) return path;
  return `${path}?q=${encodeURIComponent(q.trim())}`;
}

export const adminApi = {
  dashboard: () => apiFetch<AdminDashboard>('/admin/dashboard'),
  listCompanies: (q?: string) => apiFetch<Company[]>(withQuery('/admin/companies', q)),
  createCompany: (payload: CompanyPayload) =>
    apiFetch<Company>('/admin/companies', { method: 'POST', body: payload }),
  updateCompany: (companyId: string, payload: Partial<CompanyPayload>) =>
    apiFetch<Company>(`/admin/companies/${companyId}`, { method: 'PATCH', body: payload }),
  addCompanyMember: (companyId: string, payload: CreateEmployerPayload) =>
    apiFetch(`/admin/companies/${companyId}/members`, { method: 'POST', body: payload }),
  provisionCompany: (payload: ProvisionCompanyPayload) =>
    apiFetch<ProvisionCompanyResponse>('/admin/companies/provision', {
      method: 'POST',
      body: payload,
    }),
  verifyCompany: (companyId: string, status: Company['verificationStatus']) =>
    apiFetch<Company>(`/admin/companies/${companyId}/verification`, {
      method: 'PATCH',
      body: { status },
    }),
  updateCompanyPostingAccess: (companyId: string, canSelfPublishJobs: boolean) =>
    apiFetch<Company>(`/admin/companies/${companyId}/posting-access`, {
      method: 'PATCH',
      body: { canSelfPublishJobs },
    }),
  setCompanyPortalStatus: (
    companyId: string,
    status: CompanyPortalStatus,
    reason?: string,
  ) =>
    apiFetch<Company>(`/admin/companies/${companyId}/portal-status`, {
      method: 'PATCH',
      body: { status, reason },
    }),
  listCandidates: (params?: {
    q?: string;
    accountStatus?: string;
    outcome?: string;
    applicationStatus?: string;
  }) => {
    const qs = new URLSearchParams();
    if (params?.q?.trim()) qs.set('q', params.q.trim());
    if (params?.accountStatus) qs.set('accountStatus', params.accountStatus);
    if (params?.outcome && params.outcome !== 'all') qs.set('outcome', params.outcome);
    if (params?.applicationStatus) qs.set('applicationStatus', params.applicationStatus);
    const query = qs.toString();
    return apiFetch<AdminCandidateUser[]>(`/admin/candidates${query ? `?${query}` : ''}`);
  },
  setCandidateApplicationAccess: (userId: string, blocked: boolean) =>
    apiFetch<{ id: string; userId: string; applicationsBlocked: boolean }>(
      `/admin/candidates/${userId}/application-access`,
      { method: 'PATCH', body: { blocked } },
    ),
  listJobs: (q?: string) => apiFetch<Job[]>(withQuery('/admin/jobs', q)),
  listPendingJobs: (q?: string) => apiFetch<Job[]>(withQuery('/admin/jobs/pending', q)),
  createJob: (payload: CreateAdminJobPayload) =>
    apiFetch<Job>('/admin/jobs', { method: 'POST', body: payload }),
  publishJob: (jobId: string) =>
    apiFetch<Job>(`/admin/jobs/${jobId}/publish`, { method: 'POST' }),
  rejectJob: (jobId: string) =>
    apiFetch<Job>(`/admin/jobs/${jobId}/reject`, { method: 'POST' }),
  closeJob: (jobId: string) =>
    apiFetch<Job>(`/admin/jobs/${jobId}/close`, { method: 'POST' }),
  archiveJob: (jobId: string) =>
    apiFetch<Job>(`/admin/jobs/${jobId}/archive`, { method: 'POST' }),
  replaceScreeningQuestions: (jobId: string, questions: ScreeningQuestionInput[]) =>
    apiFetch(`/admin/jobs/${jobId}/screening-questions`, {
      method: 'PUT',
      body: { questions },
    }),
};
