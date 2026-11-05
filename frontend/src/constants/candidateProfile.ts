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

/** Stored in CandidateProfile.availabilityStatus */
export const WORK_STATUS_OPTIONS = [
  { value: 'full_time', label: 'Looking for full-time' },
  { value: 'part_time', label: 'Looking for part-time' },
  { value: 'internship', label: 'Looking for internship' },
  { value: 'contract', label: 'Looking for contract' },
  { value: 'remote', label: 'Looking for online / remote' },
  { value: 'not_looking', label: 'Not currently looking' },
] as const;

export type WorkStatusValue = (typeof WORK_STATUS_OPTIONS)[number]['value'];

export const WORK_STATUS_VALUES = WORK_STATUS_OPTIONS.map((option) => option.value);
