jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(false)
}));
jest.mock('../db/client', () => ({ query: jest.fn(), withTransaction: jest.fn() }));

import type { AuthService as AuthServiceType, AuthDomainError as AuthDomainErrorType } from './auth.service';

/**
 * Business-rule failures used to escape as `InternalServerErrorException` (a
 * 500), so a wrong password or a duplicate signup looked like a server crash to
 * the user. These assert the intended status codes survive to the Nest layer.
 */
describe('AuthService domain errors carry HTTP statuses', () => {
  const getDb = () => require('../db/client') as { query: jest.Mock; withTransaction: jest.Mock };
  const getBcrypt = () => require('bcryptjs') as { hash: jest.Mock; compare: jest.Mock };

  let authService: AuthServiceType;
  let AuthDomainError: typeof AuthDomainErrorType;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    getBcrypt().hash.mockResolvedValue('hashed-password');
    getBcrypt().compare.mockResolvedValue(false);

    const db = getDb();
    db.query.mockResolvedValue([]);
    db.withTransaction.mockImplementation(async (fn: (client: any) => Promise<void>) => {
      await fn({ query: db.query });
    });

    const mod = await import('./auth.service');
    authService = mod.authService;
    AuthDomainError = mod.AuthDomainError;
  });

  async function capture(run: () => Promise<unknown>): Promise<AuthDomainErrorType> {
    try {
      await run();
    } catch (err) {
      return err as AuthDomainErrorType;
    }
    throw new Error('Expected the call to reject, but it resolved.');
  }

  const userRow = (overrides: Record<string, unknown> = {}) => ({
    id: 'user_1',
    email: 'person@example.com',
    password_hash: 'stored-hash',
    role: 'USER',
    provider: 'EMAIL',
    current_status: null,
    google_id: null,
    avatar_url: null,
    created_at: new Date().toISOString(),
    ...overrides
  });

  it('login with an unknown email → 401', async () => {
    const err = await capture(() => authService.login('nobody@example.com', 'Password123'));
    expect(err).toBeInstanceOf(AuthDomainError);
    expect(err.status).toBe(401);
    expect(err.message).toMatch(/invalid email or password/i);
  });

  it('login with a wrong password → 401', async () => {
    getDb().query.mockResolvedValueOnce([userRow()]);
    getBcrypt().compare.mockResolvedValue(false);
    const err = await capture(() => authService.login('person@example.com', 'WrongPassword'));
    expect(err).toBeInstanceOf(AuthDomainError);
    expect(err.status).toBe(401);
  });

  it('login for a Google-only account (no password hash) → 401', async () => {
    getDb().query.mockResolvedValueOnce([userRow({ password_hash: null, provider: 'GOOGLE' })]);
    const err = await capture(() => authService.login('person@example.com', 'Password123'));
    expect(err.status).toBe(401);
  });

  it('registering an email that already exists → 409', async () => {
    getDb().query.mockResolvedValueOnce([{ id: 'user_1' }]);
    const err = await capture(() => authService.register('taken@example.com', 'Password123', 'Taken User'));
    expect(err.status).toBe(409);
    expect(err.message).toMatch(/already exists/i);
  });

  it('registering with a short password → 400', async () => {
    const err = await capture(() => authService.register('new@example.com', 'short', 'New User'));
    expect(err.status).toBe(400);
  });

  it('registering with an invalid email → 400', async () => {
    const err = await capture(() => authService.register('not-an-email', 'Password123', 'New User'));
    expect(err.status).toBe(400);
  });

  it('registering without a full name → 400', async () => {
    const err = await capture(() => authService.register('new@example.com', 'Password123', '   '));
    expect(err.status).toBe(400);
  });

  it('Google sign-in with an invalid email → 401', async () => {
    const err = await capture(() =>
      authService.registerOrLoginWithGoogle({ email: 'bad', fullName: 'No Email', googleId: 'sub-x' })
    );
    expect(err.status).toBe(401);
  });

  it('Google sign-in onto a password account → 409 (no silent takeover)', async () => {
    getDb().query.mockResolvedValueOnce([userRow({ provider: 'EMAIL' })]);
    const err = await capture(() =>
      authService.registerOrLoginWithGoogle({ email: 'person@example.com', fullName: 'Person', googleId: 'sub-1' })
    );
    expect(err.status).toBe(409);
    expect(err.message).toMatch(/email\/password/i);
  });

  it('Google sign-in with a *verified* email links onto the password account and signs in', async () => {
    getDb().query
      .mockResolvedValueOnce([userRow({ provider: 'EMAIL' })])
      .mockResolvedValueOnce([
        {
          id: 'profile_1',
          user_id: 'user_1',
          full_name: 'Person',
          target_role_id: null,
          github_url: null,
          portfolio_url: null,
          bio: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .mockResolvedValueOnce([]);
    const result = await authService.registerOrLoginWithGoogle({
      email: 'person@example.com',
      fullName: 'Person',
      googleId: 'sub-1',
      emailVerified: true
    });
    expect(result.isNewUser).toBe(false);
    expect(typeof result.token).toBe('string');
    const update = getDb().query.mock.calls.find(c => /UPDATE users/i.test(String(c[0])));
    expect(update).toBeTruthy();
  });

  it('Google sign-in linked to a different Google account → 409', async () => {
    getDb().query.mockResolvedValueOnce([
      userRow({ provider: 'GOOGLE', google_id: 'sub-original', password_hash: null })
    ]);
    const err = await capture(() =>
      authService.registerOrLoginWithGoogle({ email: 'person@example.com', fullName: 'Person', googleId: 'sub-other' })
    );
    expect(err.status).toBe(409);
    expect(err.message).toMatch(/different google account/i);
  });

  it('changePassword with a new password that is too short → 400', async () => {
    const err = await capture(() => authService.changePassword('user_1', 'anything', 'short'));
    expect(err.status).toBe(400);
  });

  it('changePassword with a wrong current password → 401', async () => {
    getDb().query.mockResolvedValueOnce([{ password_hash: 'stored-hash' }]);
    getBcrypt().compare.mockResolvedValue(false);
    const err = await capture(() => authService.changePassword('user_1', 'WrongPass1', 'NewPassword1'));
    expect(err.status).toBe(401);
    expect(err.message).toMatch(/current password/i);
  });

  it('changePassword succeeds with the correct current password', async () => {
    getDb().query
      .mockResolvedValueOnce([{ password_hash: 'stored-hash' }])
      .mockResolvedValueOnce([]);
    getBcrypt().compare.mockResolvedValue(true);
    await expect(authService.changePassword('user_1', 'RightPass1', 'NewPassword1')).resolves.toBeUndefined();
  });

  it('changePassword lets a Google-only user (no stored hash) set a password', async () => {
    getDb().query
      .mockResolvedValueOnce([{ password_hash: null }])
      .mockResolvedValueOnce([]);
    await expect(authService.changePassword('user_1', undefined, 'NewPassword1')).resolves.toBeUndefined();
    expect(getBcrypt().compare).not.toHaveBeenCalled();
  });

  it('admin setPassword on an unknown user → 404', async () => {
    getDb().query.mockResolvedValueOnce([]);
    const err = await capture(() => authService.setPassword('missing', 'NewPassword1'));
    expect(err.status).toBe(404);
  });
});
