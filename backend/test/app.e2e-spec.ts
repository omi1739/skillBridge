import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

// Mock the database layer so the whole app runs against in-memory data.
jest.mock('../src/db/client', () => {
  const fakeQuery = jest.fn(async (text: string) => {
    const key = String(text).toLowerCase();
    if (key.includes('select 1')) {
      return [{ '?column?': 1 }];
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
    query: fakeQuery,
    withTransaction: jest.fn(async <T>(fn: (client: any) => Promise<T>): Promise<T> => {
      await fakePool.connect();
      return fn({ query: fakeQuery });
    }),
    testConnection: jest.fn(async () => true)
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
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health returns ok and reports DB connectivity', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect(res => {
        expect(res.body.status).toBe('ok');
        expect(res.body.service).toBe('skillbridge-api');
        expect(res.body.database).toBe('connected');
      });
  });

  it('GET /api/jobs/:id/match returns 404 for an unknown job', () => {
    return request(app.getHttpServer())
      .get('/api/jobs/job_does_not_exist/match?userId=demo_user_01')
      .expect(404);
  });

  it('GET /api/stats returns landing page market counts', () => {
    return request(app.getHttpServer())
      .get('/api/stats')
      .expect(200)
      .expect(res => {
        expect(typeof res.body.jobPostings).toBe('number');
        expect(typeof res.body.canonicalSkills).toBe('number');
        expect(res.body.validationPercent).toBe(100);
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
