import type { Job } from '../types/api';

export function jobPostedLabel(iso?: string | null): string {
  if (!iso) return 'Recently';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'Recently';
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '1 day ago';
  if (days < 14) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 8) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function jobDeadlineDays(iso: string): {
  days: number;
  label: string;
  urgent: boolean;
  closed: boolean;
} {
  const end = new Date(iso);
  if (Number.isNaN(end.getTime())) {
    return { days: 0, label: iso, urgent: false, closed: false };
  }
  const days = Math.ceil((end.getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { days, label: 'Closed', urgent: true, closed: true };
  if (days === 0) return { days, label: 'Closing today', urgent: true, closed: false };
  if (days === 1) return { days, label: '1 day left', urgent: true, closed: false };
  return { days, label: `${days} days left`, urgent: days <= 7, closed: false };
}

export function pickFeaturedJobs(jobs: Job[], count = 8): Job[] {
  const marked = jobs.filter((job) => job.isFeatured);
  return (marked.length ? marked : jobs).slice(0, count);
}

export function companyLabel(job: Job, fallback = 'Progress Partner Employer'): string {
  return job.company?.name?.trim() || fallback;
}

export function locationLabel(job: Job): string {
  const name = job.location?.name?.trim();
  if (!name) return 'Ethiopia';
  return /ethiopia/i.test(name) ? name : `${name} – Ethiopia`;
}
