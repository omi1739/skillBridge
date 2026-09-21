export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api').replace(/\/$/, '');

export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

/**
 * Demo access is a development convenience. It stays on for local/dev builds
 * and is disabled for production builds unless NEXT_PUBLIC_ALLOW_DEMO_TOKEN=true
 * is set as an explicit override. Mirrors the backend's ALLOW_DEMO_TOKEN gating.
 */
export const DEMO_ACCESS_ENABLED =
  process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_ALLOW_DEMO_TOKEN === 'true';