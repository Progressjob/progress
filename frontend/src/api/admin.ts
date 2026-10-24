import { apiFetch } from './client';
import type {
  AdminCandidateUser,
  AdminDashboard,
  ApplicationMethod,
  Company,
  CompanyMemberRole,
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
  companySize?: string;
  foundedYear?: number;
}

export interface CreateEmployerPayload {
  email: string;
  firstName: string;
  lastName: string;
  temporaryPassword: string;
  memberRole: CompanyMemberRole;
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
  description: string;
  referenceCode?: string;
  summary?: string;
  responsibilities?: string;
  requirements?: string;
  educationRequirement?: string;
  experienceMinYears?: number;
  experienceMaxYears?: number;
  employmentType: EmploymentType;
  careerLevel?: string;
  workplaceType: WorkplaceType;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryVisibility?: boolean;
  applicationMethod: ApplicationMethod;
  applicationUrl?: string;
  applicationEmail?: string;
  applicationInstructions?: string;
  applicationDeadline: string;
  vacanciesCount: number;
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
  listCandidates: () => apiFetch<AdminCandidateUser[]>('/admin/candidates'),
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
