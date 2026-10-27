/** Standard education levels for job postings, lowest to highest. */
export const EDUCATION_LEVELS = [
  'Primary School',
  'Secondary School',
  'Preparatory / High School',
  'Certificate',
  'Diploma / TVET',
  "Bachelor's Degree",
  'Postgraduate Diploma',
  "Master's Degree",
  'Doctorate (PhD)',
  'Professional Degree (MD, LLB, etc.)',
] as const;

const ALIASES: Record<string, (typeof EDUCATION_LEVELS)[number]> = {
  primary: 'Primary School',
  'primary school': 'Primary School',
  secondary: 'Secondary School',
  'secondary school': 'Secondary School',
  'high school': 'Preparatory / High School',
  preparatory: 'Preparatory / High School',
  'preparatory / high school': 'Preparatory / High School',
  certificate: 'Certificate',
  diploma: 'Diploma / TVET',
  tvet: 'Diploma / TVET',
  'diploma / tvet': 'Diploma / TVET',
  bachelor: "Bachelor's Degree",
  'bachelor degree': "Bachelor's Degree",
  'bachelors degree': "Bachelor's Degree",
  "bachelor's degree": "Bachelor's Degree",
  ba: "Bachelor's Degree",
  bsc: "Bachelor's Degree",
  'postgraduate diploma': 'Postgraduate Diploma',
  master: "Master's Degree",
  'master degree': "Master's Degree",
  'masters degree': "Master's Degree",
  "master's degree": "Master's Degree",
  mba: "Master's Degree",
  phd: 'Doctorate (PhD)',
  doctorate: 'Doctorate (PhD)',
  'doctorate (phd)': 'Doctorate (PhD)',
  md: 'Professional Degree (MD, LLB, etc.)',
  llb: 'Professional Degree (MD, LLB, etc.)',
};

export function normalizeEducationRequirement(value?: string | null): string {
  if (!value?.trim()) return '';
  const trimmed = value.trim();
  if ((EDUCATION_LEVELS as readonly string[]).includes(trimmed)) return trimmed;
  const key = trimmed.toLowerCase().replace(/['’]/g, '');
  return ALIASES[key] ?? trimmed;
}

export function educationRequirementOptions(current?: string): string[] {
  const value = current?.trim();
  if (value && !(EDUCATION_LEVELS as readonly string[]).includes(value)) {
    return [...EDUCATION_LEVELS, value];
  }
  return [...EDUCATION_LEVELS];
}
