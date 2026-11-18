import { apiFetch, getStoredTokens } from './client';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api/v1';

export type OfficeStatus = 'new' | 'negotiating' | 'ready' | 'placed';

export interface OfficeCandidateInput {
  firstName: string;
  lastName: string;
  phone: string;
  nationalId?: string;
  headline?: string;
  gender?: string;
  dateOfBirth?: string;
  city?: string;
  summary?: string;
  expectedSalary?: number;
  consent: boolean;
  officeStatus?: OfficeStatus;
  registeredAt?: string;
  qualification?: string;
  fieldOfStudy?: string;
  institution?: string;
  languages?: string;
  department?: string;
  category?: string;
  jobGrade?: string;
  transportAllowance?: string;
  houseAllowance?: string;
  mobileAllowance?: string;
  foodCoupon?: string;
  maritalStatus?: string;
  placeOfBirth?: string;
  bloodGroup?: string;
  motherName?: string;
  emergencyContactName?: string;
  emergencyRelationship?: string;
  emergencyPhone?: string;
  guarantorName?: string;
  guarantorPhone?: string;
  guarantorNationalId?: string;
  bankAccount?: string;
  notes?: string;
}

export interface OfficeCandidateListItem {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  headline: string | null;
  city: string | null;
  fieldOfStudy: string | null;
  category: string | null;
  nationalId: string | null;
  officeStatus: string | null;
  registeredAt: string | null;
  createdAt: string;
  hasCv: boolean;
}

export interface OfficeCandidateDetail {
  id: string;
  headline: string | null;
  summary: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  city: string | null;
  nationalId: string | null;
  officeStatus: OfficeStatus | null;
  registeredAt: string | null;
  consentAt: string | null;
  expectedSalary: string | number | null;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    mustChangePassword: boolean;
  };
  educations: { qualification: string | null; fieldOfStudy: string | null; institution: string }[];
  languages: { name: string }[];
  officeRecord: Record<string, string | number | null> | null;
  resumes: { id: string; title: string; file: { id: string; originalFilename: string } }[];
  recommendations: {
    id: string;
    status: string;
    note: string | null;
    createdAt: string;
    company: { id: string; name: string };
    job: { id: string; title: string } | null;
  }[];
}

export interface OfficeCandidateListResponse {
  items: OfficeCandidateListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ImportPreviewRow {
  row: number;
  status: 'ok' | 'error';
  errors: string[];
  preview: { name: string; phone: string; nationalId: string; headline: string };
}

export const officeCandidatesApi = {
  list: (params?: { q?: string; officeStatus?: string; page?: number; pageSize?: number }) => {
    const qs = new URLSearchParams();
    if (params?.q) qs.set('q', params.q);
    if (params?.officeStatus) qs.set('officeStatus', params.officeStatus);
    if (params?.page && params.page > 1) qs.set('page', String(params.page));
    if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
    const query = qs.toString();
    return apiFetch<OfficeCandidateListResponse>(`/admin/office-candidates${query ? `?${query}` : ''}`);
  },
  remove: (id: string) => apiFetch<void>(`/admin/office-candidates/${id}`, { method: 'DELETE' }),
  get: (id: string) => apiFetch<OfficeCandidateDetail>(`/admin/office-candidates/${id}`),
  create: (body: OfficeCandidateInput) =>
    apiFetch<OfficeCandidateDetail>('/admin/office-candidates', { method: 'POST', body }),
  update: (id: string, body: Partial<OfficeCandidateInput>) =>
    apiFetch<OfficeCandidateDetail>(`/admin/office-candidates/${id}`, { method: 'PATCH', body }),
  setStatus: (id: string, officeStatus: OfficeStatus) =>
    apiFetch(`/admin/office-candidates/${id}/status`, { method: 'PATCH', body: { officeStatus } }),
  uploadCv: (id: string, file: File) => {
    const body = new FormData();
    body.append('file', file);
    return apiFetch<OfficeCandidateDetail>(`/admin/office-candidates/${id}/cv`, { method: 'POST', body });
  },
  matchingJobs: (id: string) =>
    apiFetch<
      {
        id: string;
        title: string;
        slug: string;
        score: number;
        company: { id: string; name: string };
        category: { name: string };
        location: { city: string | null; name: string } | null;
      }[]
    >(`/admin/office-candidates/${id}/matching-jobs`),
  issueAccess: (id: string) =>
    apiFetch<{ phone: string | null; temporaryPassword: string }>(
      `/admin/office-candidates/${id}/issue-access`,
      { method: 'POST' },
    ),
  previewImport: (file: File) => {
    const body = new FormData();
    body.append('file', file);
    return apiFetch<{ rows: ImportPreviewRow[] }>('/admin/office-candidates/import/preview', {
      method: 'POST',
      body,
    });
  },
  commitImport: (file: File) => {
    const body = new FormData();
    body.append('file', file);
    return apiFetch<{ created: number; skipped: number; errors: { row: number; errors: string[] }[] }>(
      '/admin/office-candidates/import/commit',
      { method: 'POST', body },
    );
  },
};

export async function downloadOfficeTemplate(): Promise<void> {
  const { accessToken } = getStoredTokens();
  const res = await fetch(`${BASE_URL}/admin/office-candidates/import/template`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
  if (!res.ok) throw new Error('Could not download the template');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const named = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '');
  link.href = url;
  link.download = named?.[1] || 'office-candidates.xlsx';
  link.click();
  URL.revokeObjectURL(url);
}
