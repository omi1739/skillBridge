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
├── backend/               # NestJS core API (Auth, Roles, Assessments, Sandbox, Projects, Neon DB)
├── frontend/              # Next.js 14 interactive dashboard & authenticated UI
├── shared/                # Shared TypeScript domain models & DTOs (@skillbridge/types)
├── docs/
│   ├── architecture/      # Relational schema.sql v2.0.0
│   ├── ontology/          # Canonical skills & Junior Backend role definition
│   └── research/          # Labor market methodology & compliance
├── infra/
│   └── docker/            # Docker Compose setup for PostgreSQL & Redis
└── scripts/
    └── dev.js             # Dev launcher with automatic port conflict resolution
```

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
- **Evidence-based pipeline**: deterministic gap analysis, recommendations, job matching, and skill passports.

> Note: Sandbox SQL evaluation and GitHub project verification are simulated (keyword-checked / inferred) rather than backed by a real engine, and are listed as follow-up work in `NEXT_STEPS.txt`.

---


