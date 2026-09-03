export interface GoogleProfile {
  email: string;
  fullName: string;
  googleId: string;
}

export interface GoogleLoginResponse {
  profile: GoogleProfile;
  isNewUser: boolean;
}

const TOKENINFO_BASE = 'https://oauth2.googleapis.com/tokeninfo';

/**
 * Verifies a Google ID token (issued by the Google Identity Services client)
 * against Google's tokeninfo endpoint using native fetch. Returns the Google
 * profile (email, display name, subject id) on success.
 *
 * If GOOGLE_CLIENT_ID is configured, the token's audience is validated against
 * it. When no client id is configured (e.g. local development) the token is
 * still verified as coming from Google, but production should always set it.
 */
export function getGoogleClientId(): string | undefined {
  return process.env.GOOGLE_CLIENT_ID || undefined;
}

export function hasGoogleClientId(): boolean {
  return Boolean(getGoogleClientId());
}

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Google credential is missing.');
  }

  const res = await fetch(`${TOKENINFO_BASE}?id_token=${encodeURIComponent(idToken)}`);
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 200);
    throw new Error(`Google could not verify the credential (${res.status}).${detail ? ` ${detail}` : ''}`);
  }

  const payload = await res.json();
  const email = payload && typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  if (!email) {
    throw new Error('Google credential did not include an email address.');
  }

  const clientId = getGoogleClientId();
  if (clientId && payload.aud !== clientId) {
    throw new Error('Google credential audience did not match this application.');
  }

  return {
    email,
    fullName: typeof payload.name === 'string' ? payload.name : defaultNameFromEmail(email),
    googleId: typeof payload.sub === 'string' ? payload.sub : `google_${email}`
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

export const googleVerifier = { verifyGoogleIdToken, getGoogleClientId, hasGoogleClientId };
