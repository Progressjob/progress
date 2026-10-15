import { apiFetch } from './client';
import type {
  AdminDashboard,
  ApplicationMethod,
  Company,
  EmploymentType,
  Job,
  QuestionType,
  WorkplaceType,
} from '../types/api';

export interface CreateAdminJobPayload {
  companyId: string;
  categoryId: string;
  locationId?: string;
  title: string;
  description: string;
  employmentType: EmploymentType;
  workplaceType: WorkplaceType;
  applicationMethod: ApplicationMethod;
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

export const adminApi = {
  dashboard: () => apiFetch<AdminDashboard>('/admin/dashboard'),
  listCompanies: () => apiFetch<Company[]>('/admin/companies'),
  listJobs: () => apiFetch<Job[]>('/admin/jobs'),
  listPendingJobs: () => apiFetch<Job[]>('/admin/jobs/pending'),
  createJob: (payload: CreateAdminJobPayload) =>
    apiFetch<Job>('/admin/jobs', { method: 'POST', body: payload }),
  publishJob: (jobId: string) =>
    apiFetch<Job>(`/admin/jobs/${jobId}/publish`, { method: 'POST' }),
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
