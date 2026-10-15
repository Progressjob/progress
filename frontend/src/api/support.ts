import { apiFetch } from './client';

export interface ContactPayload {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export const supportApi = {
  health: () => apiFetch<{ status: string; timestamp: string }>('/health', { skipAuth: true }),
  contact: (payload: ContactPayload) =>
    apiFetch('/contact', { method: 'POST', body: payload, skipAuth: true }),
};
