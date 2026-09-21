/**
 * Central gate for the shared demo identity. The demo token and the demo user
 * are development conveniences and must never be reachable in production.
 *
 * Allowed unless:
 * - NODE_ENV is 'production', OR
 * - ALLOW_DEMO_TOKEN is set to anything other than 'true' (explicit override).
 */
export function demoAccessAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.ALLOW_DEMO_TOKEN !== undefined) {
    return env.ALLOW_DEMO_TOKEN === 'true';
  }
  return env.NODE_ENV !== 'production';
}

export const DEMO_USER_ID = 'demo_user_01';
export const DEMO_EMAIL = 'candidate@skillbridge.org';