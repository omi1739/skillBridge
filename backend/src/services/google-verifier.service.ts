export interface GoogleProfile {
  email: string;
  fullName: string;
  googleId: string;
  picture?: string;
}

const TOKENINFO_BASE = 'https://oauth2.googleapis.com/tokeninfo';
const ALLOWED_ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

/**
 * Verifies a Google ID token (issued by the Google Identity Services client)
 * against Google's tokeninfo endpoint using native fetch. Returns the Google
 * profile (email, display name, subject id) on success.
 *
 * GOOGLE_CLIENT_ID must be configured in production; the token's audience is
 * always validated against it. Without a configured client id the token can
 * only be accepted outside production (e.g. local development).
 */
export function getGoogleClientId(): string | undefined {
  return process.env.GOOGLE_CLIENT_ID || undefined;
}

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Google credential is missing.');
  }
  if (typeof fetch !== 'function') {
    throw new Error('Google verification requires global fetch (Node 18+).');
  }

  const clientId = getGoogleClientId();
  // Fail closed: without an expected audience we cannot prove the token was
  // minted for this application, so reject it in production.
  if (!clientId && process.env.NODE_ENV === 'production') {
    throw new Error('Google sign-in is not configured. Set GOOGLE_CLIENT_ID.');
  }

  const res = await fetch(`${TOKENINFO_BASE}?id_token=${encodeURIComponent(idToken)}`);
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 200);
    throw new Error(`Google could not verify the credential (${res.status}).${detail ? ` ${detail}` : ''}`);
  }

  const payload = await res.json();

  const issuer = typeof payload.iss === 'string' ? payload.iss : '';
  if (issuer && !ALLOWED_ISSUERS.includes(issuer)) {
    throw new Error('Google credential was not issued by accounts.google.com.');
  }

  const expiry = Number(payload.exp || 0);
  if (expiry > 0 && Date.now() / 1000 > expiry) {
    throw new Error('Google credential has expired.');
  }

  const email = payload && typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  if (!email) {
    throw new Error('Google credential did not include an email address.');
  }

  if (clientId && payload.aud !== clientId) {
    throw new Error('Google credential audience did not match this application.');
  }

  return {
    email,
    fullName: typeof payload.name === 'string' ? payload.name : defaultNameFromEmail(email),
    googleId: typeof payload.sub === 'string' ? payload.sub : `google_${email}`,
    picture: typeof payload.picture === 'string' ? payload.picture : undefined
  };
}

function defaultNameFromEmail(email: string): string {
  const local = email.split('@')[0] || 'Google User';
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
    .trim() || 'Google User';
}

export const googleVerifier = { verifyGoogleIdToken, getGoogleClientId };
