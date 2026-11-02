import { EDUCATION_LEVELS } from './educationLevels';

export const EXPERIENCE_FILTER_OPTIONS = [
  { value: '0', label: 'Intern / Fresh graduate' },
  { value: '0-2', label: '0–2 years' },
  { value: '3-5', label: '3–5 years' },
  { value: '6-10', label: '6–10 years' },
  { value: '10+', label: '10+ years' },
] as const;

export const EDUCATION_FILTER_OPTIONS = EDUCATION_LEVELS.map((level) => ({
  value: level,
  label: level,
}));

export const SALARY_FILTER_OPTIONS = [
  { value: '0-10000', label: 'Under 10,000 ETB' },
  { value: '10000-20000', label: '10,000 – 20,000 ETB' },
  { value: '20000-35000', label: '20,000 – 35,000 ETB' },
  { value: '35000-50000', label: '35,000 – 50,000 ETB' },
  { value: '50000-80000', label: '50,000 – 80,000 ETB' },
  { value: '80000+', label: '80,000+ ETB' },
] as const;
