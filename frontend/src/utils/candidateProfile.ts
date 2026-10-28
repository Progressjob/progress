import { EXPERIENCE_STAGES, type ExperienceStage } from '../constants/candidateProfile';
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

function stageFromYears(value?: number | string | null): ExperienceStage | undefined {
  if (value == null || value === '') return undefined;
  const years = Number(value);
  if (!Number.isFinite(years)) return undefined;
  if (years <= 0) return EXPERIENCE_STAGES[0];
  if (years <= 2) return EXPERIENCE_STAGES[1];
  if (years <= 5) return EXPERIENCE_STAGES[2];
  if (years <= 10) return EXPERIENCE_STAGES[3];
  return EXPERIENCE_STAGES[4];
}

export function matchExperienceStage(careerLevel?: string | null): ExperienceStage | undefined {
  const value = careerLevel?.trim();
  if (!value) return undefined;
  const exact = EXPERIENCE_STAGES.find((stage) => stage.label === value);
  if (exact) return exact;
  const lower = value.toLowerCase();
  if (lower.includes('intern') || lower.includes('student') || lower.includes('fresh') || lower.includes('entry')) {
    return EXPERIENCE_STAGES[0];
  }
  if (lower.includes('junior')) return EXPERIENCE_STAGES[1];
  if (lower.includes('mid')) return EXPERIENCE_STAGES[2];
  if (lower.includes('senior')) return EXPERIENCE_STAGES[3];
  if (
    lower.includes('lead') ||
    lower.includes('manager') ||
    lower.includes('director') ||
    lower.includes('executive')
  ) {
    return EXPERIENCE_STAGES[4];
  }
  return undefined;
}

export function experienceStageFromProfile(profile: Pick<CandidateProfile, 'careerLevel' | 'yearsExperience'>): ExperienceStage | undefined {
  return matchExperienceStage(profile.careerLevel) ?? stageFromYears(profile.yearsExperience);
}

export function experienceStageLabel(profile: Pick<CandidateProfile, 'careerLevel' | 'yearsExperience'>): string {
  return experienceStageFromProfile(profile)?.label ?? 'Not specified';
}

export function experienceStageSelectValue(profile: Pick<CandidateProfile, 'careerLevel' | 'yearsExperience'>): string {
  return experienceStageFromProfile(profile)?.label ?? '';
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
