import { apiFetch } from './client';
import type { Category, Industry, Location, Skill } from '../types/api';

export interface TaxonomyWritePayload {
  name: string;
  parentId?: string;
  description?: string;
  isActive?: boolean;
}

export const taxonomyApi = {
  categories: () => apiFetch<Category[]>('/categories', { skipAuth: true }),
  industries: () => apiFetch<Industry[]>('/industries', { skipAuth: true }),
  locations: () => apiFetch<Location[]>('/locations', { skipAuth: true }),
  skills: (q?: string) =>
    apiFetch<Skill[]>(`/skills${q ? `?q=${encodeURIComponent(q)}` : ''}`, { skipAuth: true }),

  adminListCategories: () => apiFetch<Category[]>('/admin/categories'),
  adminListIndustries: () => apiFetch<Industry[]>('/admin/industries'),

  createCategory: (payload: TaxonomyWritePayload) =>
    apiFetch<Category>('/admin/categories', { method: 'POST', body: payload }),
  updateCategory: (id: string, payload: TaxonomyWritePayload) =>
    apiFetch<Category>(`/admin/categories/${id}`, { method: 'PUT', body: payload }),

  createIndustry: (payload: TaxonomyWritePayload) =>
    apiFetch<Industry>('/admin/industries', { method: 'POST', body: payload }),
  updateIndustry: (id: string, payload: TaxonomyWritePayload) =>
    apiFetch<Industry>(`/admin/industries/${id}`, { method: 'PUT', body: payload }),

  removeTaxonomy: (kind: 'categories' | 'industries' | 'locations' | 'skills', id: string) =>
    apiFetch<unknown>(`/admin/${kind}/${id}`, { method: 'DELETE' }),
};
