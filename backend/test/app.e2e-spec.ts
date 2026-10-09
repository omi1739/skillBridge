import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

// bcrypt hash of 'CorrectPassword123' (cost 10). Inlined rather than computed
// so the jest.mock factory below references no out-of-scope state at all.
const EXISTING_PASSWORD_HASH = '$2b$10$g/VXwOC7P.QQAATPwLh5pucAkLXvA3gKbeiX59bhu2gE1D8kLMgTW';

// Mock the database layer so the whole app runs against in-memory data.
jest.mock('../src/db/client', () => {
  const existingUser = () => ({
    id: 'user_existing',
    email: 'existing@example.com',
    password_hash: EXISTING_PASSWORD_HASH,
    role: 'USER',
    provider: 'EMAIL',
    current_status: null,
    google_id: null,
    avatar_url: null,
    created_at: new Date().toISOString()
  });
  const fakeQuery = jest.fn(async (text: string, params?: any[]) => {
    const key = String(text).toLowerCase();
    if (key.includes('select 1')) {
      return [{ '?column?': 1 }];
    }
    if (key.includes('from users') && params?.[0] === 'existing@example.com') {
      return [existingUser()];
    }
    if (key.includes('from profiles') && params?.[0] === 'user_existing') {
      return [
        {
          id: 'profile_existing',
          user_id: 'user_existing',
          full_name: 'Existing User',
          target_role_id: null,
          github_url: null,
          portfolio_url: null,
          bio: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
    }
    return [];
  });
  const fakePool = {
    query: fakeQuery,
    connect: jest.fn(async () => ({
      query: fakeQuery,
      release: jest.fn()
    })),
    end: jest.fn()
  };
  return {
    pool: fakePool,
    fallbackPool: null,
    query: fakeQuery,
    queryOn: fakeQuery,
    withTransaction: jest.fn(async <T>(fn: (client: any) => Promise<T>): Promise<T> => {
      await fakePool.connect();
      return fn({ query: fakeQuery });
    }),
    withTransactionOn: jest.fn(async <T>(fn: (client: any) => Promise<T>): Promise<T> => fn({ query: fakeQuery })),
    testConnection: jest.fn(async () => true),
    isDbDownError: jest.fn(() => false),
    getConfiguredPools: jest.fn(() => [fakePool]),
    startFailoverProbe: jest.fn(),
    stopFailoverProbe: jest.fn(),
    endAllPools: jest.fn(async () => undefined)
  };
});

describe('SkillBridge API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    // Override database.service so onModuleInit does not matter
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    // Mirror production validation so DTO-based 400s are exercised.
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false, transform: true })
    );

    // Stub the network used by the Google ID-token verifier so the auth test is
    // deterministic and does not depend on (or make) real calls to Google.
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      text: jest.fn().mockResolvedValue('')
    } as unknown as Response);

    await app.init();
  }, 45000);

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health is DB-free liveness (no database field)', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect(res => {
        expect(res.body.status).toBe('ok');
        expect(res.body.service).toBe('skillbridge-api');
        expect(res.body.database).toBeUndefined();
      });
  });

  it('GET /api/health/db reports DB connectivity', () => {
    return request(app.getHttpServer())
      .get('/api/health/db')
      .expect(200)
      .expect(res => {
        expect(res.body.status).toBe('ok');
        expect(res.body.database).toBe('connected');
      });
  });

  it('GET /api/jobs/:id/match returns 404 for an unknown job', () => {
    return request(app.getHttpServer())
      .get('/api/jobs/job_does_not_exist/match?userId=demo_user_01')
      .set('Authorization', 'Bearer demo_token_demo_user_01')
      .expect(404);
  });

  it('GET /api/stats returns landing page market counts', () => {
    return request(app.getHttpServer())
      .get('/api/stats')
      .expect(200)
      .expect(res => {
        expect(typeof res.body.jobPostings).toBe('number');
        expect(typeof res.body.canonicalSkills).toBe('number');
        // Computed from real assessment coverage; in the mocked e2e DB it is 0.
        expect(typeof res.body.validationPercent).toBe('number');
      });
  });

  it('POST /api/auth/register rejects missing fields', () => {
    return request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'test@example.com' })
      .expect(400);
  });

  it('POST /api/auth/login rejects missing credentials', () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ password: 'only-password' })
      .expect(400);
  });

  it('rejects an invalid email via DTO validation', () => {
    return request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'longenoughpass', fullName: 'Test User' })
      .expect(400);
  });

  it('POST /api/auth/register rejects mismatched passwords', () => {
    return request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'different',
        fullName: 'Test User'
      })
      .expect(400);
  });

  it('POST /api/auth/google rejects an invalid credential', () => {
    return request(app.getHttpServer())
      .post('/api/auth/google')
      .send({ idToken: 'not-a-real-google-token' })
      .expect(401);
  });

  // The three cases below all used to surface as 500s: the service threw plain
  // Errors that the exception filter could not classify.
  it('POST /api/auth/login returns 401 (not 500) for an unknown email', () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'CorrectPassword123' })
      .expect(401)
      .expect(res => {
        expect(res.body.message).toMatch(/invalid email or password/i);
      });
  });

  it('POST /api/auth/login returns 401 (not 500) for a wrong password', () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'existing@example.com', password: 'WrongPassword999' })
      .expect(401);
  });

  it('POST /api/auth/register returns 409 (not 500) for a duplicate email', () => {
    return request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'existing@example.com',
        password: 'CorrectPassword123',
        confirmPassword: 'CorrectPassword123',
        fullName: 'Duplicate User'
      })
      .expect(409);
  });

  it('POST /api/auth/login signs in with valid credentials', () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'existing@example.com', password: 'CorrectPassword123' })
      .expect(200)
      .expect(res => {
        expect(typeof res.body.token).toBe('string');
        expect(res.body.user.email).toBe('existing@example.com');
      });
  });

  it('POST /api/admin/skills/alias returns 401 without a token', () => {
    return request(app.getHttpServer())
      .post('/api/admin/skills/alias')
      .send({ skillId: 'skill_nodejs', alias: 'Node' })
      .expect(401);
  });

  it('PATCH /api/admin/roles/:id/weights returns 401 without a token', () => {
    return request(app.getHttpServer())
      .patch('/api/admin/roles/role_junior_backend/weights')
      .send({ skillId: 'skill_nodejs' })
      .expect(401);
  });

  it('GET /api/admin/overview returns 401 without a token', () => {
    return request(app.getHttpServer())
      .get('/api/admin/overview')
      .expect(401);
  });

  it('admin routes reject the demo token because the demo user is a USER, not ADMIN', () => {
    return request(app.getHttpServer())
      .get('/api/admin/overview')
      .set('Authorization', 'Bearer demo_token_demo_user_01')
      .expect(403);
  });
});
