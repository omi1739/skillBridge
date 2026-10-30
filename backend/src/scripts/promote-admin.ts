import 'reflect-metadata';
import { query, endAllPools } from '../db/client';

/**
 * Promote an existing account to ADMIN.
 *
 * Usage:
 *   npm run admin:promote --workspace=@skillbridge/api -- you@example.com
 *
 * This intentionally does not create accounts. It only changes the role of an
 * existing user, so a typo cannot silently create a new admin identity.
 */
async function main(): Promise<void> {
  const email = (process.argv[2] || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error('Usage: npm run admin:promote --workspace=@skillbridge/api -- <email>');
    process.exitCode = 1;
    return;
  }

  const rows = await query<{ id: string; email: string; role: string }>(
    `UPDATE users
        SET role = 'ADMIN',
            updated_at = CURRENT_TIMESTAMP
      WHERE lower(email) = lower($1)
      RETURNING id, email, role`,
    [email]
  );

  if (rows.length === 0) {
    console.error(`No user found with email "${email}". Sign in once with Google or register first.`);
    process.exitCode = 1;
    return;
  }

  const user = rows[0];
  console.log(`Promoted ${user.email} (${user.id}) to ${user.role}.`);
  console.log('Sign out and sign back in so the newly issued JWT contains the ADMIN role.');
}

main()
  .catch(err => {
    console.error('[admin:promote] failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await endAllPools();
  });
