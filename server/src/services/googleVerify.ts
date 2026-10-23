import { config } from '../config/env.js';

export interface VerifiedGoogleIdentity {
  sub: string;
  email: string;
  emailVerified: boolean;
  givenName?: string;
  familyName?: string;
  name?: string;
  picture?: string;
}

const GOOGLE_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);

async function fetchJson(url: string, init?: RequestInit): Promise<any | null> {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function audienceAllowed(aud: unknown): boolean {
  if (typeof aud !== 'string' || !aud) return false;
  return config.googleClientIds.includes(aud);
}

/**
 * Verifies a Google ID token or OAuth access token and returns the identity.
 *
 * Security: the token MUST have been issued to one of OUR client IDs (`aud` for ID tokens,
 * `aud`/`azp` for access tokens). Without this check any token a user granted to some other
 * website would let that website log in to Daily Sumire as the user.
 */
export async function verifyGoogleToken(token: string): Promise<VerifiedGoogleIdentity> {
  if (!token || typeof token !== 'string' || token.length > 4096) {
    throw new Error('Google token is required');
  }
  if (config.googleClientIds.length === 0) {
    throw new Error('Google sign-in is not configured on the server (GOOGLE_CLIENT_ID missing)');
  }

  // 1. ID token (JWT): tokeninfo validates signature + expiry for us.
  if (token.split('.').length === 3) {
    const info = await fetchJson(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`);
    if (info) {
      if (!audienceAllowed(info.aud)) throw new Error('Google token was issued for a different application');
      if (!GOOGLE_ISSUERS.has(info.iss)) throw new Error('Invalid Google token issuer');
      if (Number(info.exp) * 1000 < Date.now()) throw new Error('Google token expired');
      return {
        sub: String(info.sub),
        email: String(info.email || '').toLowerCase(),
        emailVerified: info.email_verified === true || info.email_verified === 'true',
        givenName: info.given_name,
        familyName: info.family_name,
        name: info.name,
        picture: info.picture,
      };
    }
  }

  // 2. OAuth access token.
  const info = await fetchJson(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token)}`);
  if (!info) throw new Error('Invalid or expired Google authentication token');
  if (!audienceAllowed(info.aud) && !audienceAllowed(info.azp)) {
    throw new Error('Google token was issued for a different application');
  }
  if (Number(info.expires_in) <= 0) throw new Error('Google token expired');

  const profile = await fetchJson('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const email = String(profile?.email || info.email || '').toLowerCase();
  const sub = String(profile?.sub || info.sub || '');
  if (!email || !sub) throw new Error('Google account does not expose an email address');

  return {
    sub,
    email,
    emailVerified: profile?.email_verified === true || info.email_verified === 'true',
    givenName: profile?.given_name,
    familyName: profile?.family_name,
    name: profile?.name,
    picture: profile?.picture,
  };
}
