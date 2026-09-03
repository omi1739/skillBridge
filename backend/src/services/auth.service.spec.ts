import { AuthService } from './auth.service';

jest.mock('../db/client', () => ({ query: jest.fn(), withTransaction: jest.fn() }));

describe('AuthService JWT secret handling', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in ORIGINAL_ENV)) delete process.env[key];
    }
    Object.assign(process.env, ORIGINAL_ENV);
    jest.resetModules();
  });

  it('fails fast when JWT_SECRET is missing in production', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    await expect(async () => {
      await import(/* webpackIgnore: true */ './auth.service');
    }).rejects.toThrow(/JWT_SECRET/);
  });

  it('falls back to an ephemeral secret in development and round-trips a token', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.JWT_SECRET;
    const { authService } = await import(/* webpackIgnore: true */ './auth.service') as { authService: AuthService };
    const token = authService.signToken({ userId: 'u1', email: 'a@b.co', role: 'USER' });
    const decoded = authService.verifyToken(token);
    expect(decoded?.userId).toBe('u1');
    expect(decoded?.role).toBe('USER');
  });
});
