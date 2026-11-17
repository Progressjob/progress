const LOCAL_MOBILE_RE = /^[79]\d{8}$/;

export function toEthiopianE164(raw: string | null | undefined): string | null {
  let digits = (raw ?? '').replace(/\D/g, '');
  if (digits.startsWith('251') && digits.length >= 12) digits = digits.slice(3);
  if (digits.startsWith('0') && digits.length >= 10) digits = digits.slice(1);
  digits = digits.slice(0, 9);
  if (!LOCAL_MOBILE_RE.test(digits)) return null;
  return `+251${digits}`;
}
