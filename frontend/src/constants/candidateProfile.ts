export const GENDER_OPTIONS = ['Male', 'Female', 'Prefer not to say'];

export const EXPERIENCE_STAGES = [
  { label: 'Intern / Fresh Graduate (0)', years: 0 },
  { label: 'Junior (0-2)', years: 1 },
  { label: 'Mid-Level (3-5)', years: 4 },
  { label: 'Senior (6-10)', years: 8 },
  { label: 'Lead / Manager (10+)', years: 12 },
] as const;

export type ExperienceStage = (typeof EXPERIENCE_STAGES)[number];

export const MANAGERIAL_EXPERIENCE_OPTIONS = [
  'None',
  'Less than 1 year',
  '1-2 years',
  '3-5 years',
  '5+ years',
];
