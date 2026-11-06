import type { ApplicationStatus } from '../types/api';

export const APPLICATION_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  submitted: ['reviewing', 'shortlisted', 'rejected', 'withdrawn'],
  reviewing: ['shortlisted', 'interview', 'rejected', 'withdrawn'],
  shortlisted: ['interview', 'offered', 'rejected', 'withdrawn'],
  interview: ['offered', 'rejected', 'withdrawn'],
  offered: ['hired', 'rejected', 'withdrawn'],
  hired: [],
  rejected: [],
  withdrawn: [],
};

export const TERMINAL_APPLICATION_STATUSES = new Set<ApplicationStatus>([
  'hired',
  'rejected',
  'withdrawn',
]);

export function formatApplicationStatus(status: string): string {
  return status.replace(/_/g, ' ');
}

export function applicationStatusBadgeClass(status: string): string {
  if (status === 'rejected') return 'badge badge-danger';
  if (status === 'hired') return 'badge badge-success';
  if (status === 'withdrawn') return 'badge badge-outline';
  return 'badge badge-info';
}

/** One badge only: first apply → status; resubmit while submitted → "Resubmitted". */
export function applicationStatusLabel(
  status: string,
  resubmittedAt?: string | null,
): string {
  if (resubmittedAt && status === 'submitted') return 'Resubmitted';
  return formatApplicationStatus(status);
}

export function applicationStatusBadgeClassFor(
  status: string,
  resubmittedAt?: string | null,
): string {
  if (resubmittedAt && status === 'submitted') return 'badge badge-outline';
  return applicationStatusBadgeClass(status);
}

export function applicationStatusPillClass(
  status: string,
  resubmittedAt?: string | null,
): string {
  if (resubmittedAt && status === 'submitted') {
    return 'emp-inbox-pill emp-inbox-pill--resubmitted';
  }
  return `emp-inbox-pill emp-inbox-pill--${status}`;
}

export const EMPLOYER_STATUS_ACTIONS: ApplicationStatus[] = [
  'reviewing',
  'shortlisted',
  'interview',
  'offered',
  'hired',
  'rejected',
];
