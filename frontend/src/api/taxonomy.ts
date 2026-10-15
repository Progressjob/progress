import { apiFetch } from './client';
import type { Category, Industry, Location, Skill } from '../types/api';

export const taxonomyApi = {
  categories: () => apiFetch<Category[]>('/categories', { skipAuth: true }),
  industries: () => apiFetch<Industry[]>('/industries', { skipAuth: true }),
  locations: () => apiFetch<Location[]>('/locations', { skipAuth: true }),
  skills: (q?: string) =>
    apiFetch<Skill[]>(`/skills${q ? `?q=${encodeURIComponent(q)}` : ''}`, { skipAuth: true }),
};
