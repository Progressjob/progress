const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

const GENERIC_APPLY = [
  /simply send (your|ur) cv through the above contact email list\.?/gi,
  /send (your|ur) (application )?cv by email:?/gi,
  /interested and qualified applicants are invited to send their (application )?cv by email:?/gi,
  /email subject line:.*/gi,
  /through the above contact email list\.?/gi,
];

export function extractEmail(text?: string | null): string | undefined {
  const match = text?.match(EMAIL_RE);
  return match?.[0];
}

export function looksLikeEmail(text: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text.trim());
}

export function hireBoxDisplay(email?: string | null, instructions?: string | null): string {
  const instr = instructions?.trim() ?? '';
  const mail = email?.trim() ?? '';
  if (instr && mail && !instr.toLowerCase().includes(mail.toLowerCase())) {
    return `${instr}\n${mail}`;
  }
  return instr || mail;
}

export function parseHireBox(raw: string): { applicationEmail?: string; applicationInstructions?: string } {
  const text = raw.trim();
  if (!text) return { applicationEmail: undefined, applicationInstructions: undefined };
  const email = looksLikeEmail(text) ? text : extractEmail(text);
  return {
    applicationInstructions: text,
    applicationEmail: email,
  };
}

export function applyViaParts(opts: {
  viaProgress: boolean;
  email?: string;
  instructions?: string;
  url?: string;
}): { who: string; via: string; extra?: string; href?: string } {
  if (opts.url) {
    return { who: 'the employer', via: opts.url, href: opts.url };
  }

  const email = opts.email?.trim() || extractEmail(opts.instructions) || '';
  let extra = (opts.instructions ?? '').replace(/\s+/g, ' ').trim();
  if (email) {
    extra = extra.replace(new RegExp(email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'), '');
  }
  for (const pattern of GENERIC_APPLY) extra = extra.replace(pattern, '');
  extra = extra.replace(/^[\s,.;:—–-]+|[\s,.;:—–-]+$/g, '').replace(/\s{2,}/g, ' ').trim();

  const via = extra && !email ? extra : email || extra;
  const href = email ? `mailto:${email}` : undefined;

  return {
    who: opts.viaProgress ? 'Progress' : 'the employer',
    via,
    extra: extra && email ? extra : undefined,
    href,
  };
}
