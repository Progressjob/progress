import { apiFetch } from './client';
import type { Application, CandidateProfile, CandidateResume } from '../types/api';

export interface UpdateProfilePayload {
  headline?: string;
  summary?: string;
  country?: string;
  region?: string;
  city?: string;
  address?: string;
  yearsExperience?: number;
  expectedSalary?: number;
  salaryCurrency?: string;
  availabilityStatus?: string;
  profileVisibility?: 'public' | 'employers' | 'private';
}

export interface ApplyPayload {
  resumeId?: string;
  coverLetter?: string;
  answers: Array<{ questionId: string; answerText: string }>;
}

export const candidateApi = {
  getProfile: () => apiFetch<CandidateProfile>('/candidate/profile'),
  updateProfile: (payload: UpdateProfilePayload) =>
    apiFetch<CandidateProfile>('/candidate/profile', {
      method: 'PATCH',
      body: payload,
    }),

  listResumes: () => apiFetch<CandidateResume[]>('/candidate/resumes'),
  uploadResume: (file: File, title: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    return apiFetch<CandidateResume>('/candidate/resumes', {
      method: 'POST',
      body: formData,
    });
  },
  setDefaultResume: (id: string) =>
    apiFetch<CandidateResume>(`/candidate/resumes/${id}/default`, {
      method: 'PATCH',
    }),
  deleteResume: (id: string) =>
    apiFetch(`/candidate/resumes/${id}`, {
      method: 'DELETE',
    }),

  applyToJob: (jobId: string, payload: ApplyPayload) =>
    apiFetch<Application>(`/jobs/${jobId}/applications`, {
      method: 'POST',
      body: payload,
    }),

  listApplications: () => apiFetch<Application[]>('/candidate/applications'),
  getApplication: (id: string) => apiFetch<Application>(`/candidate/applications/${id}`),
  withdrawApplication: (id: string) =>
    apiFetch<Application>(`/candidate/applications/${id}/withdraw`, {
      method: 'POST',
    }),
};
