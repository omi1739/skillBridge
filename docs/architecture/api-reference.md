# SkillBridge API Reference

The backend is a **NestJS** application. All routes are served under the global
prefix `/api`. Requests are validated with a global `ValidationPipe`
(`whitelist: true`, and `forbidNonWhitelisted` is enabled in production).

## Conventions

- Most `userId` fields default to the demo user (`demo_user_01`) when omitted.
- Admin routes require a bearer token for a user whose role is `ADMIN`.
- Every response carries an `X-Request-Id` header and each request is logged as
  a single-line JSON entry (observability middleware).
- Data durability: `skill_gaps` and `job_matches` are persisted on calculation;
  skills/schema/seed self-initialize on boot unless `AUTO_INIT_DB=false`.

## Health & Stats

| Method | Route          | Description                                        |
|--------|----------------|----------------------------------------------------|
| GET    | `/api/health`  | Service liveness + Postgres connectivity (`database`) |
| GET    | `/api/stats`   | Landing market counts (cached, Redis or in-memory) |

## Auth & Candidate Profile

| Method | Route                          | Notes                          |
|--------|--------------------------------|--------------------------------|
| POST   | `/api/auth/register`           | `RegisterDto`                  |
| POST   | `/api/auth/login`              | `LoginDto`                     |
| GET    | `/api/me?userId=`              | User + profile                 |
| GET    | `/api/me/account`              | Auth account                    |
| PATCH  | `/api/me/profile`              | `UpdateProfileDto`             |
| POST   | `/api/me/skills/declare`       | `DeclareSkillDto`              |
| GET    | `/api/me/gaps`                 | Skill gaps                     |
| GET    | `/api/me/recommendations`      | Recommended projects/tasks     |
| GET    | `/api/me/report`               | Printable evidence passport     |

## Catalog

| Method | Route              | Notes          |
|--------|--------------------|----------------|
| GET    | `/api/skills`      | All canonical skills |
| GET    | `/api/skills/:id`  | Single skill   |
| GET    | `/api/roles`       | All roles      |
| GET    | `/api/roles/:id`   | Single role    |

## Assessments & Sandbox

| Method | Route                          | Notes                  |
|--------|--------------------------------|------------------------|
| GET    | `/api/assessments`             | All assessments        |
| GET    | `/api/assessments/:id`         | Single assessment      |
| POST   | `/api/assessments/:id/submit`  | `SubmitAssessmentDto`  |
| GET    | `/api/sandbox/challenges`      | Sandbox challenges     |
| POST   | `/api/sandbox/run-sql`         | `RunSqlDto` (real SQL) |
| POST   | `/api/sandbox/run-code`        | `RunCodeDto` (isolated JS) |

## Projects

| Method | Route                 | Notes                   |
|--------|-----------------------|-------------------------|
| GET    | `/api/me/projects`    | Verified portfolio      |
| POST   | `/api/me/projects`    | `ProjectSubmissionDto` (GitHub verification) |

## Jobs

| Method | Route                 | Notes                           |
|--------|-----------------------|---------------------------------|
| GET    | `/api/jobs`           | All job listings                |
| GET    | `/api/jobs/matches`   | Matches for a user              |
| GET    | `/api/jobs/:id/match` | Per-job match for a user (404 if job unknown) |

## Curriculum

| Method | Route                       | Notes       |
|--------|-----------------------------|-------------|
| GET    | `/api/curriculum/institutions` | Curricula  |
| GET    | `/api/curriculum/analyze`   | Comparison vs a role |

## Admin (ADMIN role only)

| Method | Route                              | Notes               |
|--------|------------------------------------|---------------------|
| GET    | `/api/admin/overview`              | Platform overview   |
| POST   | `/api/admin/skills/alias`          | `AddAliasDto`       |
| PATCH  | `/api/admin/roles/:id/weights`     | `UpdateRoleWeightsDto` |
| POST   | `/api/admin/questions`             | `AddQuestionDto`    |

## Environment Variables

See `backend/.env.example` for the authoritative list. Key values:

| Variable           | Purpose                                             |
|--------------------|-----------------------------------------------------|
| `DATABASE_URL`     | PostgreSQL / Neon connection string (required)      |
| `JWT_SECRET`       | JWT signing secret (required in production)         |
| `PORT`             | API port (default `4000`)                           |
| `GITHUB_TOKEN`     | Optional GitHub token for project verification      |
| `AUTO_INIT_DB`     | Apply schema+seed on boot (default `true`)          |
| `REDIS_URL`        | Optional Redis for the caching layer                |
