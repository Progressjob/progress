const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

export function extractEmail(text?: string | null): string | undefined {
  const match = text?.match(EMAIL_RE);
  return match?.[0];
}

export function looksLikeEmail(text: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text.trim());
}

export function hireBoxDisplay(email?: string | null, instructions?: string | null): string {
  if (instructions !== undefined && instructions !== null) {
    return instructions;
  }
  return email ?? '';
}

export function parseHireBox(raw: string): { applicationEmail?: string; applicationInstructions?: string } {
  if (!raw && raw !== '') {
    return { applicationEmail: undefined, applicationInstructions: undefined };
  }
  const email = extractEmail(raw);
  return {
    applicationInstructions: raw,
    applicationEmail: email,
  };
}

export function applyViaParts(opts: {
  viaProgress: boolean;
  email?: string;
  instructions?: string;
  url?: string;
}): { who: string; via: string; extra?: string; href?: string; fullInstructions?: string } {
  if (opts.url) {
    return {
      who: 'the employer',
      via: opts.url,
      href: opts.url,
      fullInstructions: opts.instructions,
    };
  }

  const email = opts.email?.trim() || extractEmail(opts.instructions) || '';
  const fullInstructions = opts.instructions?.trim() || '';
  const href = email ? `mailto:${email}` : undefined;

  return {
    who: opts.viaProgress ? 'Progress' : 'the employer',
    via: email || fullInstructions || (opts.viaProgress ? 'Progress Manpower HQ' : 'Contact employer directly'),
    extra: fullInstructions && email && fullInstructions !== email ? fullInstructions : undefined,
    fullInstructions,
    href,
  };
}
