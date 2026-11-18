export function formatCandidateAmount(value: string | number | null | undefined, currency = 'ETB'): string {
  if (value == null || String(value).trim() === '') return '';
  const text = String(value).trim();
  if (!/^-?\d+(\.\d+)?$/.test(text)) return text;
  return `${new Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(Number(text))} ${currency}`.trim();
}

export function recommendationStatus(status: string): string {
  return ({ sent: 'New', viewed: 'Viewed', interested: 'Interested', declined: 'Declined' } as Record<string, string>)[status] || status;
}

export function candidateDate(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
