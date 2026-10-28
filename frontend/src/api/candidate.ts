import { apiFetch } from './client';
import type {
  Application,
  CandidateCertification,
  CandidateEducation,
  CandidateExperience,
  CandidateLanguage,
  CandidateProfile,
  CandidateResume,
  CandidateSkillLink,
  SavedJob,
} from '../types/api';

export interface UpdateProfilePayload {
  headline?: string | null;
  summary?: string;
  gender?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  address?: string | null;
  websiteUrl?: string | null;
  careerLevel?: string | null;
  managerialExperience?: string | null;
  yearsExperience?: number | null;
  expectedSalary?: number;
  salaryCurrency?: string;
  availabilityStatus?: string | null;
  profileVisibility?: 'public' | 'employers' | 'private';
  firstName?: string;
  lastName?: string;
  phone?: string;
  photoFileId?: string | null;
}

export interface EducationPayload {
  institution: string;
  qualification?: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  grade?: string;
  description?: string;
}

export interface ExperiencePayload {
  companyName: string;
  jobTitle: string;
  workingCity?: string;
  salary?: string;
  employmentType?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
}

export interface CertificationPayload {
  name: string;
  issuer?: string;
  issuedDate?: string;
  credentialId?: string;
}

export interface LanguagePayload {
  name: string;
  proficiency?: string;
  reading?: string;
  writing?: string;
  listening?: string;
}

export interface SkillNamePayload {
  name: string;
  proficiencyLevel?: string;
  yearsExperience?: number;
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

  addEducation: (payload: EducationPayload) =>
    apiFetch<CandidateEducation>('/candidate/educations', { method: 'POST', body: payload }),
  updateEducation: (id: string, payload: Partial<EducationPayload>) =>
    apiFetch<CandidateEducation>(`/candidate/educations/${id}`, { method: 'PATCH', body: payload }),
  deleteEducation: (id: string) => apiFetch(`/candidate/educations/${id}`, { method: 'DELETE' }),

  addExperience: (payload: ExperiencePayload) =>
    apiFetch<CandidateExperience>('/candidate/experiences', { method: 'POST', body: payload }),
  updateExperience: (id: string, payload: Partial<ExperiencePayload>) =>
    apiFetch<CandidateExperience>(`/candidate/experiences/${id}`, { method: 'PATCH', body: payload }),
  deleteExperience: (id: string) => apiFetch(`/candidate/experiences/${id}`, { method: 'DELETE' }),

  replaceSkills: (skills: SkillNamePayload[]) =>
    apiFetch<CandidateSkillLink[]>('/candidate/skills', {
      method: 'PUT',
      body: { skills },
    }),

  addCertification: (payload: CertificationPayload) =>
    apiFetch<CandidateCertification>('/candidate/certifications', { method: 'POST', body: payload }),
  updateCertification: (id: string, payload: Partial<CertificationPayload>) =>
    apiFetch<CandidateCertification>(`/candidate/certifications/${id}`, {
      method: 'PATCH',
      body: payload,
    }),
  deleteCertification: (id: string) =>
    apiFetch(`/candidate/certifications/${id}`, { method: 'DELETE' }),

  addLanguage: (payload: LanguagePayload) =>
    apiFetch<CandidateLanguage>('/candidate/languages', { method: 'POST', body: payload }),
  updateLanguage: (id: string, payload: Partial<LanguagePayload>) =>
    apiFetch<CandidateLanguage>(`/candidate/languages/${id}`, { method: 'PATCH', body: payload }),
  deleteLanguage: (id: string) => apiFetch(`/candidate/languages/${id}`, { method: 'DELETE' }),

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

  listSavedJobs: () => apiFetch<SavedJob[]>('/candidate/saved-jobs'),
  saveJob: (jobId: string) => apiFetch(`/candidate/saved-jobs/${jobId}`, { method: 'POST' }),
  unsaveJob: (jobId: string) => apiFetch(`/candidate/saved-jobs/${jobId}`, { method: 'DELETE' }),
};
