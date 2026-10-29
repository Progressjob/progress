import { OAuth2Client } from 'google-auth-library';

export interface GoogleIdentity {
  sub: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
}

function clip(value: string, fallback: string): string {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, 100);
}

export function namesFromGoogle(payload: {
  given_name?: string;
  family_name?: string;
  name?: string;
  email: string;
}): { firstName: string; lastName: string } {
  const given = payload.given_name?.trim();
  const family = payload.family_name?.trim();
  if (given && family) {
    return { firstName: clip(given, 'User'), lastName: clip(family, 'User') };
  }
  const full = payload.name?.trim() ?? '';
  const parts = full.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return { firstName: clip(parts[0], 'User'), lastName: clip(parts.slice(1).join(' '), 'User') };
  }
  if (given) {
    return { firstName: clip(given, 'User'), lastName: clip(family || 'User', 'User') };
  }
  if (full) {
    return { firstName: clip(full, 'User'), lastName: 'User' };
  }
  const local = payload.email.split('@')[0] || 'User';
  return { firstName: clip(local, 'User'), lastName: 'User' };
}

export async function verifyGoogleIdToken(idToken: string, clientId: string): Promise<GoogleIdentity> {
  const client = new OAuth2Client(clientId);
  const ticket = await client.verifyIdToken({ idToken, audience: clientId });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    throw new Error('Google token is missing identity');
  }
  const names = namesFromGoogle({
    given_name: payload.given_name,
    family_name: payload.family_name,
    name: payload.name,
    email: payload.email,
  });
  return {
    sub: payload.sub,
    email: payload.email.trim().toLowerCase(),
    emailVerified: payload.email_verified === true,
    firstName: names.firstName,
    lastName: names.lastName,
  };
}
