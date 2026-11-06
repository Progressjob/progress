/** Ethiopian mobile numbers stored as E.164: +2519XXXXXXXX or +2517XXXXXXXX */

const LOCAL_MOBILE_RE = /^[79]\d{8}$/;

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/** Strip country / trunk prefixes down to the 9-digit national mobile number. */
export function toEthiopianLocalDigits(raw: string | null | undefined): string {
  let digits = digitsOnly(raw ?? '');
  if (digits.startsWith('251') && digits.length >= 12) {
    digits = digits.slice(3);
  }
  if (digits.startsWith('0') && digits.length >= 10) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 9);
}

export function toEthiopianE164(raw: string | null | undefined): string | null {
  const local = toEthiopianLocalDigits(raw);
  if (!LOCAL_MOBILE_RE.test(local)) return null;
  return `+251${local}`;
}

export function isValidEthiopianMobile(raw: string | null | undefined): boolean {
  return toEthiopianE164(raw) !== null;
}

export function formatEthiopianPhoneDisplay(raw: string | null | undefined): string {
  const e164 = toEthiopianE164(raw);
  if (!e164) return (raw ?? '').trim();
  const local = e164.slice(4);
  return `+251 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}
