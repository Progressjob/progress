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

export const EMPLOYER_STATUS_ACTIONS: ApplicationStatus[] = [
  'reviewing',
  'shortlisted',
  'interview',
  'offered',
  'hired',
  'rejected',
];
