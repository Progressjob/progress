import { apiFetch } from './client';

export interface UploadedFile {
  id: string;
  originalFilename: string;
  mimeType: string;
}

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://localhost:3000/api/v1';

export function publicFileUrl(fileId: string): string {
  return `${BASE_URL}/files/${fileId}/public`;
}

export const filesApi = {
  uploadBusinessLicence: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch<UploadedFile>('/files/upload/document', { method: 'POST', body: formData });
  },
  uploadLogo: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch<UploadedFile>('/files/upload/logo', {
      method: 'POST',
      body: formData,
    });
  },
  uploadProfileImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch<UploadedFile>('/files/upload/profile_image', {
      method: 'POST',
      body: formData,
    });
  },
};
