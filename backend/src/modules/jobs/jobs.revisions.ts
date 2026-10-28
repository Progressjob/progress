export type JobRevisionSourceValue = 'employer' | 'admin';

export interface JobRevisionChange {
  field: string;
  label: string;
  from: string | null;
  to: string | null;
}

export interface JobContentSnapshot {
  title?: string | null;
  categoryId?: string | null;
  locationId?: string | null;
  summary?: string | null;
  description?: string | null;
  responsibilities?: string | null;
  requirements?: string | null;
  educationRequirement?: string | null;
  experienceMinYears?: unknown;
  experienceMaxYears?: unknown;
  employmentType?: string | null;
  careerLevel?: string | null;
  workplaceType?: string | null;
  salaryMin?: unknown;
  salaryMax?: unknown;
  salaryCurrency?: string | null;
  salaryVisibility?: boolean | null;
  vacanciesCount?: number | null;
  applicationDeadline?: Date | string | null;
  applicationMethod?: string | null;
  applicationEmail?: string | null;
  applicationInstructions?: string | null;
  applicationUrl?: string | null;
}

export interface JobContentLabels {
  categoryFrom?: string | null;
  categoryTo?: string | null;
  locationFrom?: string | null;
  locationTo?: string | null;
}

const FIELDS: Array<{ key: keyof JobContentSnapshot; label: string }> = [
  { key: 'title', label: 'Title' },
  { key: 'categoryId', label: 'Category' },
  { key: 'locationId', label: 'Location' },
  { key: 'summary', label: 'Summary' },
  { key: 'description', label: 'Description' },
  { key: 'responsibilities', label: 'Responsibilities' },
  { key: 'requirements', label: 'Requirements' },
  { key: 'educationRequirement', label: 'Education' },
  { key: 'experienceMinYears', label: 'Min experience' },
  { key: 'experienceMaxYears', label: 'Max experience' },
  { key: 'employmentType', label: 'Employment type' },
  { key: 'careerLevel', label: 'Career level' },
  { key: 'workplaceType', label: 'Workplace' },
  { key: 'salaryMin', label: 'Salary min' },
  { key: 'salaryMax', label: 'Salary max' },
  { key: 'salaryCurrency', label: 'Currency' },
  { key: 'salaryVisibility', label: 'Show salary' },
  { key: 'vacanciesCount', label: 'Vacancies' },
  { key: 'applicationDeadline', label: 'Deadline' },
  { key: 'applicationMethod', label: 'How to apply' },
  { key: 'applicationEmail', label: 'Application email' },
  { key: 'applicationInstructions', label: 'Application instructions' },
  { key: 'applicationUrl', label: 'Application URL' },
];

const ENUM_LABELS: Record<string, Record<string, string>> = {
  employmentType: {
    full_time: 'Full time',
    part_time: 'Part time',
    contract: 'Contract',
    internship: 'Internship',
    temporary: 'Temporary',
    volunteer: 'Volunteer',
  },
  workplaceType: {
    on_site: 'On site',
    hybrid: 'Hybrid',
    remote: 'Remote',
  },
  applicationMethod: {
    email: 'Company contact',
    admin: 'Hire through Progress',
    internal: 'Internal',
    external_url: 'External URL',
  },
};

function hasToNumber(value: object): value is { toNumber: () => number } {
  return typeof (value as { toNumber?: unknown }).toNumber === 'function';
}

function formatDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().slice(0, 10);
}

export function formatJobFieldValue(field: string, value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (field === 'applicationDeadline') {
    if (value instanceof Date || typeof value === 'string') return formatDate(value);
  }
  if (typeof value === 'object' && value !== null && hasToNumber(value)) {
    const n = value.toNumber();
    return Number.isFinite(n) ? String(n) : String(value);
  }
  if (typeof value === 'number') return String(value);
  if (value instanceof Date) return formatDate(value);
  const raw = String(value).trim();
  if (!raw) return null;
  const mapped = ENUM_LABELS[field]?.[raw];
  return mapped ?? raw;
}

export function diffJobContent(
  before: JobContentSnapshot,
  after: JobContentSnapshot,
  labels: JobContentLabels = {},
): JobRevisionChange[] {
  const changes: JobRevisionChange[] = [];
  for (const { key, label } of FIELDS) {
    let from = formatJobFieldValue(key, before[key]);
    let to = formatJobFieldValue(key, after[key]);
    if (key === 'categoryId') {
      from = labels.categoryFrom?.trim() || from;
      to = labels.categoryTo?.trim() || to;
    }
    if (key === 'locationId') {
      from = labels.locationFrom?.trim() || from;
      to = labels.locationTo?.trim() || to;
    }
    if (from === to) continue;
    changes.push({ field: key, label, from, to });
  }
  return changes;
}

export function mergeJobSnapshot(
  current: JobContentSnapshot,
  patch: Partial<JobContentSnapshot>,
): JobContentSnapshot {
  const next: JobContentSnapshot = { ...current };
  (Object.keys(patch) as Array<keyof JobContentSnapshot>).forEach((key) => {
    const value = patch[key];
    if (value !== undefined) {
      (next as Record<string, unknown>)[key] = value;
    }
  });
  return next;
}
