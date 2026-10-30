export const COMPANY_SIZE_OPTIONS = [
  { value: '1-10', label: '1–10 employees' },
  { value: '11-50', label: '11–50 employees' },
  { value: '51-200', label: '51–200 employees' },
  { value: '201-500', label: '201–500 employees' },
  { value: '501-1000', label: '501–1000 employees' },
  { value: '1000+', label: '1000+ employees' },
] as const;

export function formatCompanySize(value?: string | null): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  const match = COMPANY_SIZE_OPTIONS.find((option) => option.value === raw);
  return match ? match.label : `${raw} employees`;
}
