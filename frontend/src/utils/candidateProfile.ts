import { YEARS_EXPERIENCE_OPTIONS } from '../constants/candidateProfile';
import type { CandidateProfile } from '../types/api';

export function locationLine(profile: CandidateProfile): string {
  return [profile.city, profile.region, profile.country].filter(Boolean).join(', ');
}

export function hasNoExperienceFlag(profile: CandidateProfile): boolean {
  if ((profile.experiences ?? []).length > 0) return false;
  return profile.yearsExperience != null && Number(profile.yearsExperience) === 0;
}

export function profileStrength(profile: CandidateProfile): number {
  const checks = [
    Boolean(profile.photoFileId),
    Boolean(profile.user?.firstName && profile.user?.lastName),
    Boolean(profile.city || profile.region),
    Boolean(profile.summary?.trim()),
    Boolean(profile.experiences?.length) || hasNoExperienceFlag(profile),
    Boolean(profile.educations?.length),
    Boolean(profile.certifications?.length),
    Boolean(profile.skills?.length),
    Boolean(profile.languages?.length),
    Boolean(profile.resumes?.length),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function yearsExperienceLabel(value?: number | string | null): string {
  if (value == null || value === '') return 'Not specified';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 'Not specified';
  const match = YEARS_EXPERIENCE_OPTIONS.find((option) => option.value !== '' && Number(option.value) === numeric);
  if (match) return match.label;
  if (numeric === 1) return '1 year';
  return `${numeric} years`;
}

export function yearsSelectValue(value?: number | string | null): string {
  if (value == null || value === '') return '';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '';
  const match = YEARS_EXPERIENCE_OPTIONS.find((option) => option.value !== '' && Number(option.value) === numeric);
  return match?.value ?? String(numeric);
}

export function isOpenToOpportunities(profile: CandidateProfile): boolean {
  return profile.availabilityStatus !== 'not_looking';
}

export function visibilityLabel(value: CandidateProfile['profileVisibility']): string {
  if (value === 'public') return 'Visible to everyone';
  if (value === 'private') return 'Hidden from employers';
  return 'Visible to employers';
}

export function nextVisibility(
  value: CandidateProfile['profileVisibility'],
): CandidateProfile['profileVisibility'] {
  if (value === 'employers') return 'public';
  if (value === 'public') return 'private';
  return 'employers';
}

export function displayOrFallback(value?: string | null, fallback = 'Not specified'): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

export function websiteHref(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
