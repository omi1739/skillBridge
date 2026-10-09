jest.mock('bcryptjs', () => ({ hash: jest.fn().mockResolvedValue('mock_hash'), compare: jest.fn().mockResolvedValue(true) }));
jest.mock('../db/client', () => ({ query: jest.fn(), withTransaction: jest.fn() }));

describe('AuthService provisioning SQL casts against Postgres 42P18', () => {
  // Use a factory so each resetModules() gives fresh refs.
  const getMock = () => {
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
     
    const { authService } = await import('./auth.service');
    await authService.register('nullable@test.com', 'Password123', 'No Status User', undefined, undefined);
    const sqls = db.query.mock.calls.map((c: any[]) => String(c[0]));
    const userSql = sqls.find((s: string) => s.includes('INSERT INTO users') && s.includes('password_hash'));
    const profileSql = sqls.find((s: string) => s.includes('INSERT INTO profiles'));
    expect(userSql).toMatch(/\$5::varchar/);
    expect(profileSql).toMatch(/\$4::varchar/);
  });

  /**
   * Guards the Google-signup 500 directly. The bug was a profiles INSERT whose
   * placeholders jumped `$1,$2,$3,NULL,$5,$6` while only five values were
   * supplied; Postgres sizes the bind to the highest `$n`, so it demanded six
   * and aborted the transaction. Asserting *parity* (not a specific SQL string)
   * keeps this catching the bug class no matter how the query is reworded.
   */
  const expectBindParity = (calls: any[][]) => {
    let sawInsert = false;
    for (const call of calls) {
      const text = String(call[0]);
      const params = call[1];
      if (/INSERT INTO/i.test(text)) sawInsert = true;
      const placeholders = [...text.matchAll(/\$(\d+)/g)].map(m => Number(m[1]));
      if (placeholders.length === 0) continue;
      const unique = Array.from(new Set(placeholders)).sort((a, b) => a - b);
      // 1..N with no gaps.
      expect(unique).toEqual(unique.map((_, i) => i + 1));
      expect(Array.isArray(params)).toBe(true);
      // Every distinct placeholder has exactly one supplied value.
      expect(params.length).toBe(unique.length);
    }
    expect(sawInsert).toBe(true);
  };

  it('supplies one value per placeholder in the Google provisioning flow', async () => {
    const db = getMock();
    const { authService } = await import('./auth.service');
    await authService.registerOrLoginWithGoogle(
      { email: 'parity-google@example.com', fullName: 'Parity Google', googleId: 'sub-parity' },
      undefined
    );
    expectBindParity(db.query.mock.calls);
  });

  it('supplies one value per placeholder in the email registration flow', async () => {
    const db = getMock();
    const { authService } = await import('./auth.service');
    await authService.register('parity-email@example.com', 'Password123', 'Parity Email', undefined, undefined);
    expectBindParity(db.query.mock.calls);
  });
});
