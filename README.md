# SkillBridge 🌉

> **Evidence-Based Labor Market Intelligence, Practical Skill Assessment & Explainable Career Pathways**

SkillBridge bridges the disconnect between local labor market demand and early-career job seekers. Rather than acting as a generic job board, course marketplace, or black-box AI chatbot, SkillBridge provides a structured, evidence-backed feedback loop for tech talent.

---

## 🔄 The Core Feedback Loop

```text
  ┌───────────────────────┐
  │   Labor Market Data   │ (Curated / Validated Job Postings)
  └───────────┬───────────┘
              ▼
  ┌───────────────────────┐
  │   Skill Demand Model  │ (Role Profiles & Required Competencies)
  └─────┬───────────┬─────┘
        │           │
        ▼           ▼
┌──────────────┐ ┌────────────────────┐
│ User Profile │ │  Skill Assessment  │ (MCQs, Output Prediction, Query/Code Tasks)
└───────┬──────┘ └─────────┬──────────┘
        │                  │
        └────────┬─────────┘
                 ▼
      ┌──────────────────────┐
      │    Skill Evidence    │ (Self-Reported vs. Practical Demonstrated)
      └──────────┬───────────┘
                 ▼
      ┌──────────────────────┐
      │   Skill Gap Engine   │ (Transparent, Mathematical Priority Ranking)
      └──────────┬───────────┘
                 ▼
      ┌──────────────────────┐
      │     Action Plan      │ (Targeted Learning & Multi-Skill Capstone Projects)
      └──────────┬───────────┘
                 ▼
      ┌──────────────────────┐
      │     Reassessment     │ (Quantifiable Skill Progression)
      └──────────┬───────────┘
                 ▼
      ┌──────────────────────┐
      │ Explainable Job Match│ (Direct Evidence Breakdown, No Black Boxes)
      └──────────────────────┘
```

---

## 🌟 Core Principles

1. **Evidence Beats Self-Declaration**: Practical problem solving and verified execution carry higher confidence than self-checked skill boxes.
2. **Transparent & Explainable Scoring**: Every gap and recommendation is backed by auditable formulas:
   $$\text{Priority} = \text{Role Weight} \times \text{Market Demand} \times (1 - \text{Demonstrated Proficiency})$$
3. **Narrow & Deep First**: Starting with a single target archetype (**Junior Backend Engineer in Bangladesh**) and core skills (`JavaScript`, `Node.js`, `SQL`, `PostgreSQL`, `Git`, `REST APIs`, `Docker`).
4. **Safety by Design**: Sandboxed, ephemeral, network-disabled execution for candidate code and SQL evaluation.
5. **Privacy & Ethical Fairness**: Scoring strictly measures demonstrated competency, eliminating demographic bias.

---

## 🏛️ System Architecture

A **Modular Monolith** architecture designed for velocity, clean bounded contexts, and simple local execution.

```text
skillbridge/
├── apps/
│   ├── web/                  # Next.js (TypeScript, Modern Responsive UI)
│   └── api/                  # NestJS / Node.js Backend API
├── packages/
│   ├── types/                # Shared TypeScript models and DTOs
│   ├── validation/           # Zod validation schemas
│   └── config/               # Shared configs
├── workers/
│   ├── market-ingestion/     # Job data pipeline & normalization
│   └── assessment-runner/    # Ephemeral isolated sandbox runner
├── docs/
│   ├── research/             # Market studies, surveys, and legal matrix
│   ├── ontology/             # Canonical skill definitions and synonyms
│   └── decisions/            # Architectural Decision Records (ADRs)
├── infra/
│   └── docker/               # PostgreSQL, Redis, and service containers
└── README.md
```

### Technology Stack
- **Frontend**: Next.js (React, TypeScript), Vanilla CSS / Custom Design System.
- **Backend**: NestJS / Node.js (TypeScript, Clean Architecture).
- **Database**: PostgreSQL (Normalized relational model for users, roles, skills, attempts, gaps).
- **Caching & Queues**: Redis (Rate limiting, background jobs).
- **Testing & Sandbox**: Ephemeral Docker sandbox for isolated code/SQL evaluation.

---

## 🗺️ Step-by-Step Implementation Roadmap

We are executing this project **step by step** through incremental, independently verifiable milestones:

```
[Phase 0] Setup & Research Documentation
    ├── Step 1: Project Blueprint & Repository Workspace (Current)
    ├── Step 2: Canonical Skill Ontology & Synonym Mapping
    └── Step 3: Relational Database Schema Design (PostgreSQL)

[Phase 1] Core Foundation & Target Role Profile
    ├── Step 4: Backend API & Shared Monorepo Config
    ├── Step 5: Auth & User Onboarding Flow
    └── Step 6: Role Profile & Market Demand Display (Junior Backend Engineer)

[Phase 2] Labor Market Intelligence Pipeline
    ├── Step 7: Curated Job Ingestion & Normalization Worker
    └── Step 8: Interactive Market Analytics & Demand Metrics

[Phase 3] Assessment Engine & Evidence Modeling
    ├── Step 9: MCQ & Scenario-Based Assessment Engine
    ├── Step 10: Ephemeral Sandbox Evaluation (SQL & Practical Code Tasks)
    └── Step 11: Multi-Tiered Skill Evidence Store

[Phase 4] Skill Gap Engine & Action Planning
    ├── Step 12: Transparent Skill Gap Computation & Priority Engine
    └── Step 13: Concrete Action Plan & Project Recommendations

[Phase 5] Explainable Job Matching & Extension
    ├── Step 14: Explainable Match Scoring & Verification
    └── Step 15: Recruiter & Analytics Console
```

---

## 🚀 Current Milestone: Phase 0 — Setup & Initial Data Foundation

- [x] **Step 1**: Initialize `README.md` and repository roadmap.
- [ ] **Step 2**: Create initial docs directory and canonical skill ontology (`/docs/ontology/skills_v1.json`).
- [ ] **Step 3**: Design PostgreSQL database schema migrations for roles, skills, and user profiles.

---

## 📄 License & Attribution
Developed as an open, evidence-driven project for technical skill alignment and labor market intelligence.
