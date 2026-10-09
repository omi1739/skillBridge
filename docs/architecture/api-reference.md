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
| GET    | `/api/health`  | Service liveness (DB-free — safe for monitor polling without waking Neon compute) |
| GET    | `/api/health/db` | Explicit Postgres connectivity probe (`database`) |
| GET    | `/api/stats`   | Landing market counts (cached, Redis or in-memory) |

## Auth & Candidate Profile

| Method | Route                          | Notes                          |
|--------|--------------------------------|--------------------------------|
| POST   | `/api/auth/register`           | `RegisterDto` (email, password, confirmPassword, fullName, currentStatus?, targetRoleId?) |
| POST   | `/api/auth/login`              | `LoginDto`                     |
| POST   | `/api/auth/google`             | `GoogleAuthDto` (idToken, currentStatus?) — Google Sign-In, creates or logs in a user. A Google token whose email is Google-verified may link onto an existing email/password account (the password keeps working); an unverified Google email cannot |
| POST   | `/api/auth/forgot-password`    | `ForgotPasswordDto` (email) — emails a single-use, 1-hour reset link (`{FRONTEND_URL}/reset-password?token=…`). Always returns `{ success: true }` (no account enumeration). In non-production without `RESEND_API_KEY` the link is returned as `devResetUrl` |
| POST   | `/api/auth/reset-password`     | `ResetPasswordDto` (token, newPassword, confirmPassword) — consumes the token atomically and sets the new password |
| GET    | `/api/me?userId=`              | User + profile                 |
| GET    | `/api/me/account`              | Auth account                    |
| PATCH  | `/api/me/profile`              | `UpdateProfileDto`             |
| POST   | `/api/me/password`             | `ChangePasswordDto` (currentPassword?, newPassword, confirmPassword) — change own password; `currentPassword` required only when one is already set (Google-only users may set a first password) |
| POST   | `/api/me/skills/declare`       | `DeclareSkillDto`              |
| GET    | `/api/me/gaps`                 | Skill gaps                     |
| GET    | `/api/me/recommendations`      | Recommended projects/tasks     |
| GET    | `/api/me/report`               | Printable evidence passport     |

Auth failures carry accurate status codes: `400` invalid input, `401` invalid
credentials, `409` duplicate account / email already bound to another provider.
Error bodies follow the Nest shape `{ statusCode, message, error }`, where
`message` is the actionable text (an array for class-validator failures).

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
| GET    | `/api/assessments/diagnostic?count=` | Anonymous-safe diagnostic draw (answer-stripped) |
| GET    | `/api/assessments/:id`         | Single assessment      |
| POST   | `/api/assessments/:id/start`   | Opens/reuses an attempt. `StartAssessmentDto` (`count?`, `questionIds?`) — `questionIds` lets a visitor who loaded the diagnostic anonymously submit the exact subset they were shown |
| POST   | `/api/assessments/:id/submit`  | `SubmitAssessmentDto` (`answers`, `attemptId?`) — graded server-side |
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

## Market & ingestion

| Method | Route                | Notes                                                          |
|--------|----------------------|---------------------------------------------------------------|
| GET    | `/api/market/demand` | Computed demand per skill for a role (`?roleId=`)             |
| GET    | `/api/ingest/sources`| Registered job sources with counts and last-sync times        |
| GET    | `/api/ingest/runs`   | Recent ingestion runs (`?limit=`, ADMIN) — status/fetched/inserted/updated/error |
| POST   | `/api/ingest/run`    | Trigger ingestion (`source`, `replace`, ADMIN)                |

Ingestion is serialized by a Postgres advisory lock, so a scheduled cron, the
admin endpoint and a manual `npm run db:ingest` can never run concurrently. Each
run is recorded in `job_ingest_runs`; a run that inserts/updates zero jobs is
flagged and reported to `ALERT_WEBHOOK_URL` (when configured).


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
| PATCH  | `/api/admin/users/:id/password`    | `AdminResetPasswordDto` (newPassword) — reset another user's password (account recovery; no self-service email reset exists) |

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
| `HTTP_TIMEOUT_MS`  | Hard timeout (ms) for every outbound HTTP request (default `15000`) |
| `ALERT_WEBHOOK_URL`| Optional Slack/Discord/generic webhook for 5xx errors and zero-yield ingestion alerts |
| `FRONTEND_URL`     | Public frontend origin used to build password-reset links            |
| `RESEND_API_KEY`   | Resend API key for password-reset emails (unset = log link / dev return) |
| `EMAIL_FROM`       | From address for outbound email (default `SkillBridge <onboarding@resend.dev>`) |
