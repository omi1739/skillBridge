# SkillBridge

SkillBridge is an open-source labor market intelligence and skill assessment platform. It helps early-career developers identify real industry skill demands, test their capabilities through practical evaluations, identify concrete skill gaps, and follow structured project-based roadmaps.

## Overview

Unlike conventional job boards or generic course aggregators, SkillBridge focuses on an evidence-based pipeline:

- **Market Demand Ingestion**: Ingests and normalizes local job postings to extract current technology requirements.
- **Competency Verification**: Tests candidate skills through objective assessments (MCQs, code debugging, and SQL/logic queries) rather than self-reported checkboxes.
- **Deterministic Gap Analysis**: Calculates missing competencies against target roles using transparent mathematical weights.
- **Actionable Project Roadmaps**: Recommends multi-skill portfolio projects tailored to bridge identified gaps.
- **Explainable Matching**: Evaluates candidate fit for open roles with clear explanations of strengths and missing prerequisites.

---

## Architecture & Tech Stack

SkillBridge is structured as a modular TypeScript monorepo to ensure clean separation of concerns without premature microservice overhead:

- **Frontend (`frontend/`)**: Next.js 14, React, custom responsive dark-theme CSS design system.
- **Backend (`backend/`)**: NestJS (Node.js runtime), modular architecture (Auth, Roles, Skills, Assessments, Sandbox, Projects, Jobs, Curriculum, Admin).
- **Database**: PostgreSQL (Neon Serverless) with normalized schema (16 relational tables).
- **Shared Types (`shared/`)**: Domain interfaces & DTOs shared across backend and frontend.

### Repository Layout

```
SkillBridge/
├── backend/                         # NestJS core API (@skillbridge/api)
│   ├── src/
│   │   ├── main.ts                  # API bootstrap (global /api prefix, CORS)
│   │   ├── app.module.ts            # Root module wiring all feature modules
│   │   ├── app.controller.ts        # GET /api/health
│   │   ├── db/                      # DB client + schema/seed runner
│   │   │   ├── client.ts            # PG pool & helpers
│   │   │   └── seed.ts              # applySchema() + seedAll()
│   │   ├── database/                # NestJS DatabaseModule (connection ping)
│   │   ├── modules/                 # Feature modules (one per domain)
│   │   │   ├── auth/                # register/login, /me, guards, decorators
│   │   │   │   ├── guards/          # JwtAuthGuard, OptionalJwtAuthGuard, RolesGuard
│   │   │   │   └── decorators/      # @CurrentUser(), @Roles()
│   │   │   ├── admin/               # ontology management (aliases, weights, questions)
│   │   │   ├── assessments/         # MCQ diagnostic + grading
│   │   │   ├── curriculum/          # institution curricula comparison
│   │   │   ├── jobs/                # job listings + matching
│   │   │   ├── projects/            # portfolio project verification
│   │   │   ├── roles/               # role catalog + demand context
│   │   │   ├── sandbox/             # SQL / JS challenge runners
│   │   │   └── skills/              # canonical skill ontology
│   │   ├── services/                # core domain logic (match, gap, sandbox, auth)
│   │   ├── store/                   # data-access layer over PostgreSQL
│   │   └── data/                    # seed data (skills, roles, assessment, jobs)
│   └── package.json
│
├── frontend/                        # Next.js 14 interactive dashboard (@skillbridge/web)
│   └── src/app/
│       ├── page.tsx                 # single-page app with 8-tab UI
│       ├── layout.tsx               # root layout
│       └── globals.css              # dark-theme design system
│
├── shared/                          # Shared TypeScript domain models (@skillbridge/types)
│   └── src/index.ts                 # Role, Skill, Assessment, JobMatchResult, etc.
│
├── docs/
│   ├── architecture/
│   │   └── schema.sql               # normalized relational schema (16 tables)
│   ├── ontology/                    # canonical skills.json & junior_backend_role.json
│   └── research/                    # market study methodology & compliance
│
├── infra/
│   └── docker/                      # Docker Compose for PostgreSQL & Redis
│
└── scripts/
    └── dev.js                       # dev launcher with port conflict resolution
```

### Backend API Surface

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| GET | `/api/health` | Liveness check | – |
| POST | `/api/auth/register` | Create account | – |
| POST | `/api/auth/login` | Sign in, returns JWT | – |
| GET | `/api/me` | Current user + profile | Optional |
| GET | `/api/me/account` | Account details | JWT |
| PATCH | `/api/me/profile` | Update profile | JWT |
| POST | `/api/me/skills/declare` | Self-report a skill | JWT |
| GET | `/api/me/gaps` | Skill gaps for a role | – |
| GET | `/api/me/recommendations` | Action recommendations | – |
| GET | `/api/me/report` | Career/evidence passport | – |
| GET | `/api/me/projects` | User's projects | Optional |
| POST | `/api/me/projects` | Submit a project | JWT |
| GET | `/api/skills`, `/api/skills/:id` | Skill ontology | – |
| GET | `/api/roles`, `/api/roles/:id` | Role catalog | – |
| GET | `/api/assessments`, `/api/assessments/:id` | Assessments | – |
| POST | `/api/assessments/:id/submit` | Submit answers, get score | JWT |
| GET | `/api/sandbox/challenges` | List challenges | – |
| POST | `/api/sandbox/run-sql` | Run SQL challenge | JWT |
| POST | `/api/sandbox/run-code` | Run JS challenge | JWT |
| GET | `/api/curriculum/institutions` | List curricula | – |
| GET | `/api/curriculum/analyze` | Compare curriculum to role | – |
| GET | `/api/jobs` | Job listings | – |
| GET | `/api/jobs/matches` | Matched jobs for user | – |
| GET | `/api/admin/overview` | Ontology stats | – |
| POST | `/api/admin/skills/alias` | Add skill alias | Admin |
| PATCH | `/api/admin/roles/:id/weights` | Tune role skill weights | Admin |
| POST | `/api/admin/questions` | Add assessment question | Admin |

---

## Implementation Roadmap

The project is built incrementally across focused phases. Each phase is verified through automated tests and working prototypes before progressing.

### Initial Target Scope
To maintain focus, the initial implementation targets one specific role archetype: **Junior Backend Engineer** (focusing on Node.js, SQL, PostgreSQL, REST APIs, Git, and Docker).

### Phase Breakdown

- **Phase 0: Research, Ontology & Database Design** *(Current)*
  - Define research methodology and legal data ingestion policy.
  - Establish canonical skill ontology and synonym mapping dictionary.
  - Design normalized relational schema in PostgreSQL.

- **Phase 1: Core Backend & Role Profiles**
  - Initialize monorepo workspace and environment configuration.
  - Implement authentication, user profiles, and role browsing.
  - Build UI for viewing role skill profiles and demand metrics.

- **Phase 2: Market Intelligence Engine**
  - Implement job posting ingestion and normalization pipeline.
  - Calculate transparent demand frequency metrics.

- **Phase 3: Assessment & Evidence Collection**
  - Build MCQ and scenario-based diagnostic engine.
  - Add isolated, sandboxed SQL query evaluation.
  - Store multi-tiered skill evidence (Self-reported vs. Verified).

- **Phase 4: Skill Gap & Action Planning Engine**
  - Implement deterministic gap calculation algorithm.
  - Generate curated learning and multi-skill capstone project recommendations.

- **Phase 5: Explainable Job Matching & Analytics**
  - Implement match ranking with clear textual explanations.
  - Add admin/research console for ontology management.

---

## Development Setup

### Prerequisites
- Node.js (>= 20.x)
- npm (>= 10.x)
- PostgreSQL (>= 15) OR a Neon Serverless connection string

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Backend expects a `.env` file at `backend/.env` with:
```
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/dbname?sslmode=require
PORT=4000
JWT_SECRET=<a-long-random-secret>
```

Frontend reads `NEXT_PUBLIC_API_BASE` (defaults to `http://localhost:4000/api`). See `frontend/.env.example`.

### 3. Prepare the Database
Applies the relational schema and seeds demo data (skills, roles, assessment, jobs, demo user):
```bash
npm run db:setup
```

### 4. Run in Development
Starts both backend (port 4000) and frontend (port 3000), auto-releasing occupied ports:
```bash
npm run dev
```
Or launch separately:
```bash
npm run dev:backend
npm run dev:frontend
```

### 5. Build & Run Production
```bash
npm run build     # compiles shared, backend, and frontend
npm start         # runs the compiled NestJS API
```

### 6. Testing
The monorepo ships with automated unit, e2e, and UI contract tests:

```bash
npm test --workspace=@skillbridge/api     # backend unit tests (services, jest)
npm run test:e2e --workspace=@skillbridge/api   # backend HTTP e2e (supertest, mocked DB)
npm test --workspace=@skillbridge/web     # frontend UI API-contract tests (vitest + Testing Library)
npm run typecheck                         # typecheck all workspaces
```

Backend unit and e2e tests isolate the real Postgres connection by mocking the `db/client` layer, so they run without a database. Frontend tests render the dashboard, mock `fetch`, and assert the exact request payload field names (`query`, `code`, `selectedAnswer`) sent to the API. A GitHub Actions workflow (`.github/workflows/ci.yml`) runs typecheck, unit tests, e2e tests, and builds on every push/PR to `main`.


### Demo Access
- Demo user: `candidate@skillbridge.org` / `SkillBridge@123`
- The demo login grants access to all tabs, including the Admin & Ontology Console.

---

## Current Status

The core platform is fully scaffolded and functional as a demo:
- **9 NestJS modules**: Auth, Roles, Skills, Assessments, Sandbox, Projects, Jobs, Curriculum, Admin.
- **8-tab interactive UI**: Market, Curriculum, Assessment, Sandbox, Gaps, Actions, Jobs, Admin.
- **JWT authentication** with role-based protection on admin writes (`RolesGuard` + `@Roles('ADMIN')`).
- **Practical evaluation**: MCQ assessment grading and SQL/JS sandbox challenge runners that elevate skill evidence to `HIGH` confidence.
- **Real execution**: SQL challenges run against an in-memory SQLite engine (sql.js) with ordered result-set grading; JS challenges run in an isolated VM sandbox with a hard time limit; GitHub repositories are verified against the live GitHub REST API (test files, Dockerfile, README, commit count) instead of keyword guessing.
- **Evidence-based pipeline**: deterministic gap analysis, recommendations, job matching, and skill passports.

> GitHub verification requires network access to `api.github.com`; set `GITHUB_TOKEN` in `backend/.env` for higher rate limits. Unverifiable repos are stored as `PENDING`/`NEEDS_REVIEW` rather than falsely marked verified.

---


