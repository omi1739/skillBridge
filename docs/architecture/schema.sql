-- SkillBridge Normalized PostgreSQL Database Schema
-- Version 2.0.0 (backing the persistent store)
-- Mirrors the domain types in packages/types/src/index.ts

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users & Profiles
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(100) PRIMARY KEY,                -- e.g. 'demo_user_01'
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(50) DEFAULT 'USER',            -- USER, ADMIN, RECRUITER
    current_status VARCHAR(50),                 -- STUDENT, JOB_HOLDER, JOB_SEEKER, OTHER
    google_id VARCHAR(255),
    provider VARCHAR(50) DEFAULT 'EMAIL',       -- EMAIL, GOOGLE
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Idempotent upgrades for databases created before these columns existed.
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_status VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'EMAIL';

CREATE TABLE IF NOT EXISTS profiles (
    id VARCHAR(100) PRIMARY KEY,                -- e.g. 'profile_01'
    user_id VARCHAR(100) UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    target_role_id VARCHAR(100),
    github_url VARCHAR(255),
    portfolio_url VARCHAR(255),
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Roles, Skills & Ontology
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(100) PRIMARY KEY,                -- e.g. 'role_junior_backend'
    slug VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    market_context JSONB NOT NULL DEFAULT '{}', -- { region, experienceLevel, typicalTitles[] }
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS skills (
    id VARCHAR(100) PRIMARY KEY,                -- e.g. 'skill_nodejs'
    canonical_name VARCHAR(150) UNIQUE NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    prerequisites JSONB NOT NULL DEFAULT '[]',  -- array of skill ids
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS skill_aliases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    skill_id VARCHAR(100) NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    alias VARCHAR(150) NOT NULL,
    CONSTRAINT uq_skill_alias UNIQUE (skill_id, alias)
);

CREATE TABLE IF NOT EXISTS role_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id VARCHAR(100) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    skill_id VARCHAR(100) NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    is_required BOOLEAN DEFAULT TRUE,
    role_weight NUMERIC(4, 2) NOT NULL DEFAULT 0.80,
    market_demand_frequency NUMERIC(4, 2) DEFAULT 0.50,
    proficiency_target VARCHAR(50) DEFAULT 'Intermediate',
    CONSTRAINT uq_role_skill UNIQUE (role_id, skill_id)
);

-- 3. Labor Market Intelligence
CREATE TABLE IF NOT EXISTS job_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    access_method VARCHAR(50) NOT NULL,         -- API, PARTNER_FEED, MANUAL_CURATED
    license_notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jobs (
    id VARCHAR(100) PRIMARY KEY,                -- e.g. 'job_dhaka_01'
    source_id UUID REFERENCES job_sources(id) ON DELETE SET NULL,
    external_id VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    experience_level VARCHAR(50),
    role_id VARCHAR(100) REFERENCES roles(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    posted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS job_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id VARCHAR(100) NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    skill_id VARCHAR(100) NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    is_required BOOLEAN DEFAULT TRUE,           -- true=required, false=preferred
    extraction_confidence NUMERIC(4, 2) DEFAULT 1.00,
    CONSTRAINT uq_job_skill UNIQUE (job_id, skill_id)
);

-- 4. Assessments & Question Bank
CREATE TABLE IF NOT EXISTS assessments (
    id VARCHAR(100) PRIMARY KEY,                -- e.g. 'assessment_backend_diagnostic'
    skill_id VARCHAR(100) REFERENCES skills(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    time_limit_minutes INT DEFAULT 20,
    passing_score NUMERIC(5, 2) DEFAULT 70.00,
    version VARCHAR(20) DEFAULT '1.0.0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS questions (
    id VARCHAR(100) PRIMARY KEY,                -- e.g. 'q1'
    assessment_id VARCHAR(100) NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    code_snippet TEXT,
    question_type VARCHAR(50) NOT NULL,         -- MCQ, OUTPUT_PREDICTION, CODE_DEBUG, SQL_QUERY
    options_json JSONB,                         -- array of string options
    correct_answer TEXT NOT NULL,
    explanation TEXT NOT NULL,
    sub_skill VARCHAR(100) NOT NULL,
    difficulty VARCHAR(50) DEFAULT 'Intermediate',
    points INT DEFAULT 10
);

CREATE TABLE IF NOT EXISTS assessment_attempts (
    id VARCHAR(100) PRIMARY KEY,                -- e.g. 'attempt_<ts>'
    user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assessment_id VARCHAR(100) NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    score NUMERIC(5, 2) DEFAULT 0.00,           -- 0 to 100
    total_points_earned INT DEFAULT 0,
    max_points INT DEFAULT 0,
    passed BOOLEAN DEFAULT FALSE,
    sub_skill_scores_json JSONB NOT NULL DEFAULT '[]',
    status VARCHAR(50) DEFAULT 'IN_PROGRESS'    -- IN_PROGRESS, COMPLETED, ABANDONED
);

-- 5. Evidence & Skill Gap Analysis
CREATE TABLE IF NOT EXISTS skill_evidence (
    id VARCHAR(100) PRIMARY KEY,                -- e.g. 'ev_01'
    user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id VARCHAR(100) NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    source_type VARCHAR(50) NOT NULL,           -- SELF_REPORTED, ASSESSMENT, PROJECT, GITHUB
    source_id VARCHAR(255),
    proficiency_score NUMERIC(4, 2) NOT NULL,   -- 0.00 to 1.00
    confidence VARCHAR(50) DEFAULT 'MEDIUM',    -- LOW, MEDIUM, HIGH
    metadata_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_evidence_skill_source UNIQUE (user_id, skill_id, source_type)
);

CREATE TABLE IF NOT EXISTS skill_gaps (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id VARCHAR(100) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    skill_id VARCHAR(100) NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    skill_name VARCHAR(150) NOT NULL,
    priority_score NUMERIC(5, 4) NOT NULL,
    role_weight NUMERIC(4, 2) NOT NULL,
    market_demand NUMERIC(4, 2) NOT NULL,
    demonstrated_proficiency NUMERIC(4, 2) NOT NULL,
    explanation TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'MAJOR_GAP',     -- MAINTAIN, MINOR_GAP, MAJOR_GAP
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_gap_user_role_skill UNIQUE (user_id, role_id, skill_id)
);

-- 6. Action Plans, Projects & Job Matches
CREATE TABLE IF NOT EXISTS recommendations (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,                  -- CAPSTONE_PROJECT, PRACTICAL_TASK, REASSESSMENT
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    target_skill_ids JSONB NOT NULL DEFAULT '[]',
    target_skill_names JSONB NOT NULL DEFAULT '[]',
    estimated_hours INT DEFAULT 0,
    priority_level VARCHAR(50) DEFAULT 'HIGH',  -- CRITICAL, HIGH, MEDIUM
    status VARCHAR(50) DEFAULT 'PENDING'        -- PENDING, IN_PROGRESS, COMPLETED
);

CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    repo_url VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    primary_skills JSONB NOT NULL DEFAULT '[]',
    detected_stack JSONB NOT NULL DEFAULT '[]',
    has_tests BOOLEAN DEFAULT FALSE,
    has_docker BOOLEAN DEFAULT FALSE,
    has_readme BOOLEAN DEFAULT FALSE,
    commit_count_estimate INT DEFAULT 0,
    verification_status VARCHAR(50) DEFAULT 'PENDING',  -- PENDING, VERIFIED, NEEDS_REVIEW
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS job_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id VARCHAR(100) NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    match_score NUMERIC(5, 2) NOT NULL,         -- 0 to 100
    matched_skills JSONB NOT NULL,
    missing_skills JSONB NOT NULL,
    explanation TEXT NOT NULL,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_profiles_user ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_role_skills_role ON role_skills(role_id);
CREATE INDEX IF NOT EXISTS idx_questions_assessment ON questions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_attempts_user ON assessment_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_evidence_user_skill ON skill_evidence(user_id, skill_id);
CREATE INDEX IF NOT EXISTS idx_gaps_user_role ON skill_gaps(user_id, role_id);
CREATE INDEX IF NOT EXISTS idx_job_skills_job ON job_skills(job_id);
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
