import type { Job, JobStatus } from '../../types/api';

export function prettyJobEnum(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function formatJobStatus(status: JobStatus): string {
  if (status === 'pending_review') return 'Pending review';
  return prettyJobEnum(status);
}

export function formatJobDeadline(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatSalaryForAdmin(job: Job): string {
  const currency = job.salaryCurrency ?? 'ETB';
  const min = job.salaryMin != null ? Number(job.salaryMin).toLocaleString() : '';
  const max = job.salaryMax != null ? Number(job.salaryMax).toLocaleString() : '';
  const range = min && max ? `${min} – ${max}` : min || max;
  if (!range) return job.salaryVisibility ? 'Not set' : 'Negotiable';
  return job.salaryVisibility ? `${currency} ${range}` : `Hidden · ${currency} ${range}`;
}

export function actorName(actor?: {
  firstName?: string;
  lastName?: string;
  email?: string | null;
}): string {
  const name = `${actor?.firstName ?? ''} ${actor?.lastName ?? ''}`.trim();
  return name || actor?.email || 'Unknown user';
}
