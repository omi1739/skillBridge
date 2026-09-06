jest.mock('bcryptjs', () => ({ hash: jest.fn().mockResolvedValue('mock_hash'), compare: jest.fn().mockResolvedValue(true) }));
jest.mock('../db/client', () => ({ query: jest.fn(), withTransaction: jest.fn() }));

describe('AuthService provisioning SQL casts against Postgres 42P18', () => {
  // Use a factory so each resetModules() gives fresh refs.
  const getMock = () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('../db/client') as {
      query: jest.Mock;
      withTransaction: jest.Mock;
    };
  };

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    const db = getMock();
    db.query.mockResolvedValue([]);
    db.withTransaction.mockImplementation(async (fn: (client: any) => Promise<void>) => {
      const client = { query: db.query };
      await fn(client);
    });
  });

  it('uses ::varchar casts for nullable params in the Google-user INSERT', async () => {
    const db = getMock();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { authService } = await import('./auth.service');
    await authService.registerOrLoginWithGoogle(
      { email: 'google-nullable@example.com', fullName: 'Nullable Google User', googleId: 'sub-nullable-1' },
      undefined
    );
    const sqls = db.query.mock.calls.map((c: any[]) => String(c[0]));
    const userSql = sqls.find((s: string) => s.includes('INSERT INTO users') && s.includes('google_id'));
    expect(userSql).toMatch(/\$4::varchar/);
    expect(userSql).toMatch(/\$7::varchar/);
  });

  it('uses ::varchar casts for nullable params in the email-register INSERT', async () => {
    const db = getMock();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { authService } = await import('./auth.service');
    await authService.register('nullable@test.com', 'Password123', 'No Status User', undefined, undefined);
    const sqls = db.query.mock.calls.map((c: any[]) => String(c[0]));
    const userSql = sqls.find((s: string) => s.includes('INSERT INTO users') && s.includes('password_hash'));
    const profileSql = sqls.find((s: string) => s.includes('INSERT INTO profiles'));
    expect(userSql).toMatch(/\$5::varchar/);
    expect(profileSql).toMatch(/\$4::varchar/);
  });
});
