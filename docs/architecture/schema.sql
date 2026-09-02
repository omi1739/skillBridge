-- SkillBridge Normalized PostgreSQL Database Schema
-- Version 1.0.0 (Phase 0)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users & Profiles
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'USER', -- USER, ADMIN, RECRUITER
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    target_role_id VARCHAR(100),
    github_url VARCHAR(255),
    portfolio_url VARCHAR(255),
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Roles, Skills & Ontology
CREATE TABLE roles (
    id VARCHAR(100) PRIMARY KEY, -- e.g. 'role_junior_backend'
    slug VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE skills (
    id VARCHAR(100) PRIMARY KEY, -- e.g. 'skill_nodejs'
    canonical_name VARCHAR(150) UNIQUE NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE skill_aliases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    skill_id VARCHAR(100) NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    alias VARCHAR(150) NOT NULL,
    CONSTRAINT uq_skill_alias UNIQUE (skill_id, alias)
);

CREATE TABLE role_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id VARCHAR(100) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    skill_id VARCHAR(100) NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    is_required BOOLEAN DEFAULT TRUE,
    role_weight NUMERIC(4, 2) NOT NULL DEFAULT 0.80, -- 0.00 to 1.00
    market_demand_frequency NUMERIC(4, 2) DEFAULT 0.50, -- 0.00 to 1.00
    proficiency_target VARCHAR(50) DEFAULT 'Intermediate',
    CONSTRAINT uq_role_skill UNIQUE (role_id, skill_id)
);

-- 3. Labor Market Intelligence
CREATE TABLE job_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    access_method VARCHAR(50) NOT NULL, -- API, PARTNER_FEED, MANUAL_CURATED
    license_notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID REFERENCES job_sources(id) ON DELETE SET NULL,
    external_id VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    role_id VARCHAR(100) REFERENCES roles(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    experience_level VARCHAR(50),
    posted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE job_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    skill_id VARCHAR(100) NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    is_required BOOLEAN DEFAULT TRUE,
    extraction_confidence NUMERIC(4, 2) DEFAULT 1.00,
    CONSTRAINT uq_job_skill UNIQUE (job_id, skill_id)
);

-- 4. Assessments & Question Bank
CREATE TABLE assessments (
    id VARCHAR(100) PRIMARY KEY, -- e.g. 'assessment_backend_core'
    skill_id VARCHAR(100) REFERENCES skills(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    time_limit_minutes INT DEFAULT 20,
    passing_score NUMERIC(5, 2) DEFAULT 70.00,
    version VARCHAR(20) DEFAULT '1.0.0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id VARCHAR(100) NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL, -- 'MCQ', 'OUTPUT_PREDICTION', 'CODE_DEBUG', 'SQL_QUERY'
    options_json JSONB, -- Array of string options for MCQs
    correct_answer TEXT NOT NULL,
    explanation TEXT NOT NULL,
    sub_skill VARCHAR(100) NOT NULL, -- e.g. 'Event Loop', 'Index Optimization'
    difficulty VARCHAR(50) DEFAULT 'Intermediate', -- 'Beginner', 'Intermediate', 'Advanced'
    points INT DEFAULT 10
);

CREATE TABLE assessment_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assessment_id VARCHAR(100) NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    score NUMERIC(5, 2) DEFAULT 0.00,
    max_score NUMERIC(5, 2) DEFAULT 100.00,
    sub_skill_scores_json JSONB,
    status VARCHAR(50) DEFAULT 'IN_PROGRESS' -- 'IN_PROGRESS', 'COMPLETED', 'ABANDONED'
);

-- 5. Evidence & Skill Gap Analysis
CREATE TABLE skill_evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id VARCHAR(100) NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    source_type VARCHAR(50) NOT NULL, -- 'SELF_REPORTED', 'ASSESSMENT', 'PROJECT', 'GITHUB'
    source_id VARCHAR(255),
    proficiency_score NUMERIC(4, 2) NOT NULL, -- 0.00 to 1.00
    confidence VARCHAR(50) DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH'
    metadata_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE skill_gaps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id VARCHAR(100) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    skill_id VARCHAR(100) NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    priority_score NUMERIC(5, 4) NOT NULL, -- role_weight * market_demand * (1 - proficiency)
    role_weight NUMERIC(4, 2) NOT NULL,
    market_demand NUMERIC(4, 2) NOT NULL,
    demonstrated_proficiency NUMERIC(4, 2) NOT NULL,
    explanation TEXT NOT NULL,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Action Plans & Job Matches
CREATE TABLE recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'CAPSTONE_PROJECT', 'CONCEPT_STUDY', 'PRACTICAL_EXERCISE'
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    target_skill_ids JSONB NOT NULL,
    action_url VARCHAR(255),
    priority_level VARCHAR(50) DEFAULT 'HIGH',
    status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'IN_PROGRESS', 'COMPLETED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE job_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    match_score NUMERIC(5, 2) NOT NULL, -- 0 to 100%
    matched_skills JSONB NOT NULL,
    missing_skills JSONB NOT NULL,
    explanation TEXT NOT NULL,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for performance
CREATE INDEX idx_profiles_user ON profiles(user_id);
CREATE INDEX idx_role_skills_role ON role_skills(role_id);
CREATE INDEX idx_questions_assessment ON questions(assessment_id);
CREATE INDEX idx_attempts_user ON assessment_attempts(user_id);
CREATE INDEX idx_evidence_user_skill ON skill_evidence(user_id, skill_id);
CREATE INDEX idx_gaps_user_role ON skill_gaps(user_id, role_id);
CREATE INDEX idx_job_skills_job ON job_skills(job_id);
