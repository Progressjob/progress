import { apiFetch } from './client';
import type {
  AdminCandidateUser,
  AdminDashboard,
  ApplicationMethod,
  Company,
  CompanyPortalStatus,
  EmploymentType,
  Job,
  JobStatus,
  QuestionType,
  TalentDetail,
  TalentSearchResponse,
  TalentSpotlightResponse,
  WorkplaceType,
  AdminJobListResponse,
} from '../types/api';

export interface CompanyPayload {
  name: string;
  industryId?: string;
  description?: string;
  vision?: string;
  mission?: string;
  websiteUrl?: string;
  email?: string;
  phone?: string;
  country?: string;
  region?: string;
  city?: string;
  address?: string;
  contactPerson?: string;
  licenceNumber?: string;
  businessLicenceFileId?: string;
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
  isFeatured?: boolean;
}

export interface ScreeningQuestionInput {
  questionText: string;
  questionType: QuestionType;
  isRequired?: boolean;
  sortOrder: number;
  options?: string[];
}

export interface AdminJobListParams {
  q?: string;
  status?: JobStatus | '';
  scope?: 'active' | 'history';
  companyId?: string;
  industry?: string;
  employmentType?: EmploymentType | '';
  workplaceType?: WorkplaceType | '';
  employerEdited?: boolean;
  page?: number;
  pageSize?: number;
}

function withQuery(path: string, q?: string) {
  if (!q?.trim()) return path;
  return `${path}?q=${encodeURIComponent(q.trim())}`;
}

function withJobListQuery(path: string, params?: AdminJobListParams) {
  const qs = new URLSearchParams();
  if (params?.q?.trim()) qs.set('q', params.q.trim());
  if (params?.status) qs.set('status', params.status);
  if (params?.scope) qs.set('scope', params.scope);
  if (params?.companyId) qs.set('companyId', params.companyId);
  if (params?.industry?.trim()) qs.set('industry', params.industry.trim());
  if (params?.employmentType) qs.set('employmentType', params.employmentType);
  if (params?.workplaceType) qs.set('workplaceType', params.workplaceType);
  if (params?.employerEdited === true) qs.set('employerEdited', 'true');
  if (params?.employerEdited === false) qs.set('employerEdited', 'false');
  if (params?.page && params.page > 1) qs.set('page', String(params.page));
  if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
  const query = qs.toString();
  return query ? `${path}?${query}` : path;
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
  verifyCompany: (companyId: string, status: Company['verificationStatus'], reviewNote?: string, documentId?: string) =>
    apiFetch<Company>(`/admin/companies/${companyId}/verification`, {
      method: 'PATCH',
      body: { status, reviewNote, documentId },
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
  listJobs: (params?: AdminJobListParams) =>
    apiFetch<AdminJobListResponse>(withJobListQuery('/admin/jobs', params)),
  getJob: (jobId: string) => apiFetch<Job>(`/admin/jobs/${jobId}`),
  createJob: (payload: CreateAdminJobPayload) =>
    apiFetch<Job>('/admin/jobs', { method: 'POST', body: payload }),
  updateJob: (jobId: string, payload: Partial<CreateAdminJobPayload>) =>
    apiFetch<Job>(`/admin/jobs/${jobId}`, { method: 'PATCH', body: payload }),
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
  talentSpotlight: () => apiFetch<TalentSpotlightResponse>('/admin/talent/spotlight'),
  searchTalent: (params: { q?: string; availabilityStatus?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params.q?.trim()) qs.set('q', params.q.trim());
    if (params.availabilityStatus?.trim()) qs.set('availabilityStatus', params.availabilityStatus.trim());
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    const query = qs.toString();
    return apiFetch<TalentSearchResponse>(`/admin/talent${query ? `?${query}` : ''}`);
  },
  getTalent: (candidateId: string) => apiFetch<TalentDetail>(`/admin/talent/${candidateId}`),
};
