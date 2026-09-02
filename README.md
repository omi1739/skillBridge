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

- **Frontend (`apps/web`)**: Next.js, TypeScript, custom responsive CSS design system.
- **Backend (`apps/api`)**: NestJS (Node.js runtime), modular architecture (Auth, Roles, Skills, Assessments, Gaps, Matches).
- **Database**: PostgreSQL with normalized schema (roles, canonical skills, attempts, evidence records).
- **Background Workers (`workers/`)**: Ingestion worker for market data cleaning and isolated worker for sandboxed evaluation.
- **Cache & Message Broker**: Redis for job queues and rate limiting.

### Repository Layout

```
skillbridge/
├── apps/
│   ├── web/               # Next.js web application
│   └── api/               # NestJS core API
├── packages/
│   ├── types/             # Shared TypeScript interfaces & DTOs
│   ├── validation/        # Shared validation schemas
│   └── config/            # Shared ESLint/TS configs
├── workers/
│   ├── market-ingestion/  # Job data extraction & normalization
│   └── assessment-runner/ # Ephemeral code/SQL execution sandbox
├── docs/
│   ├── research/          # Market research, data legal matrix, user studies
│   ├── ontology/          # Canonical skills and synonym definitions
│   └── decisions/         # Architecture Decision Records (ADRs)
└── infra/
    └── docker/            # Docker Compose setup for local PostgreSQL, Redis & API
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
- Docker & Docker Compose
- PostgreSQL (>= 15)

*(Detailed setup instructions will be updated as packages are initialized in Phase 1).*

---

## License
MIT
