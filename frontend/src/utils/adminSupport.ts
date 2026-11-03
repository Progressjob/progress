import type { JobReport, SupportPerson } from '../types/api';

export function personName(person?: SupportPerson | null): string {
  if (!person) return '';
  return `${person.firstName} ${person.lastName}`.trim() || person.email || '';
}

export function reportedInRange(iso: string, range: string): boolean {
  if (!range || range === 'all') return true;
  const created = new Date(iso).getTime();
  if (Number.isNaN(created)) return true;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (range === 'today') return created >= startOfToday.getTime();
  if (range === '7d') return created >= Date.now() - 7 * 86_400_000;
  if (range === '30d') return created >= Date.now() - 30 * 86_400_000;
  return true;
}

export function matchesReportSearch(report: JobReport, term: string): boolean {
  const needle = term.trim().toLowerCase();
  if (!needle) return true;
  const company = report.job.company;
  return [
    report.job.title,
    report.job.employmentType,
    company.name,
    company.contactPerson,
    personName(report.job.creator),
    personName(report.reporter),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(needle);
}

export function reportDateLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
