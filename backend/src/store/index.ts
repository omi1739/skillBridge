import {
  User,
  Profile,
  Skill,
  Role,
  RoleSkill,
  Assessment,
  Question,
  AssessmentAttempt,
  SkillEvidence,
  ActionRecommendation,
  ProjectEvidence,
  JobListing,
  SkillGap,
  JobMatchResult
} from '@skillbridge/types';
import { query, withTransaction } from '../db/client';

interface SkillRow {
  id: string;
  canonical_name: string;
  category: string;
  description: string;
  prerequisites: string[] | null;
  aliases: string[] | null;
}

interface RoleSkillRowFull {
  role_id: string;
  skill_id: string;
  is_required: boolean;
  role_weight: number;
  market_demand_frequency: number;
  proficiency_target: string;
}

interface RoleRow {
  id: string;
  slug: string;
  title: string;
  category: string;
  description: string;
  market_context: any | null;
}

interface QuestionRow {
  id: string;
  assessment_id: string;
  prompt: string;
  code_snippet: string | null;
  question_type: string;
  options_json: string[] | null;
  correct_answer: string;
  explanation: string;
  sub_skill: string;
  difficulty: string;
  points: number;
}

interface AttemptRow {
  id: string;
  user_id: string;
  assessment_id: string;
  started_at: string;
  completed_at: string | null;
  score: number;
  total_points_earned: number;
  max_points: number;
  passed: boolean;
  sub_skill_scores_json: any;
  status: string;
}

interface ProjectRow {
  id: string;
  user_id: string;
  title: string;
  repo_url: string;
  description: string;
  primary_skills: string[] | null;
  detected_stack: string[] | null;
  has_tests: boolean;
  has_docker: boolean;
  has_readme: boolean;
  commit_count_estimate: number;
  verification_status: string;
  submitted_at: string;
}

interface RecRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  description: string;
  target_skill_ids: string[] | null;
  target_skill_names: string[] | null;
  estimated_hours: number;
  priority_level: string;
  status: string;
}

function mapProficiency(level: string): 'Beginner' | 'Intermediate' | 'Advanced' {
  if (level === 'Beginner' || level === 'Advanced') return level;
  return 'Intermediate';
}

export class AppDataStore {
  // ---- Skills ----
  async getSkills(): Promise<Skill[]> {
    const rows = await query<SkillRow>(
      `SELECT s.*, COALESCE(array_agg(sa.alias) FILTER (WHERE sa.alias IS NOT NULL), '{}') AS aliases
       FROM skills s
       LEFT JOIN skill_aliases sa ON sa.skill_id = s.id
       GROUP BY s.id
       ORDER BY s.id`
    );
    return rows.map(r => ({
      id: r.id,
      canonicalName: r.canonical_name,
      category: r.category,
      description: r.description,
      aliases: r.aliases || [],
      prerequisites: r.prerequisites || []
    }));
  }

  async getSkill(id: string): Promise<Skill | undefined> {
    const skills = await this.getSkills();
    return skills.find(s => s.id === id);
  }

  // ---- Roles ----
  async getRole(id: string): Promise<Role | undefined> {
    const roles = await this.getRoles();
    return roles.find(r => r.id === id);
  }

  async getRoles(): Promise<Role[]> {
    const skills = await this.getSkills();
    const skillMap = new Map(skills.map(s => [s.id, s]));

    const roleRows = await query<RoleRow>(`SELECT * FROM roles ORDER BY id`);
    const rsRows = await query<RoleSkillRowFull>(`SELECT * FROM role_skills ORDER BY role_id, skill_id`);

    const rsByRole = new Map<string, RoleSkillRowFull[]>();
    for (const r of rsRows) {
      const list = rsByRole.get(r.role_id);
      if (list) {
        list.push(r);
      } else {
        rsByRole.set(r.role_id, [r]);
      }
    }

    return roleRows.map(row => rowToRole(row, rsByRole.get(row.id) || [], skillMap));
  }

  // ---- Assessments ----
  async getAssessment(id: string): Promise<Assessment | undefined> {
    const assessments = await this.getAssessments();
    return assessments.find(a => a.id === id);
  }

  async getAssessments(): Promise<Assessment[]> {
    const rows = await query<any>(`SELECT * FROM assessments ORDER BY id`);
    const qRows = await query<QuestionRow>(`SELECT * FROM questions ORDER BY id`);
    return rows.map((a: any) => {
      const questions = qRows
        .filter(q => q.assessment_id === a.id)
        .map(q => this.mapQuestion(q));
      return {
        id: a.id,
        skillId: a.skill_id,
        title: a.title,
        description: a.description,
        timeLimitMinutes: a.time_limit_minutes,
        passingScore: Number(a.passing_score),
        version: a.version,
        questions
      };
    });
  }

  private mapQuestion(q: QuestionRow): Question {
    return {
      id: q.id,
      assessmentId: q.assessment_id,
      prompt: q.prompt,
      codeSnippet: q.code_snippet || undefined,
      questionType: q.question_type as Question['questionType'],
      options: q.options_json || undefined,
      correctAnswer: q.correct_answer,
      explanation: q.explanation,
      subSkill: q.sub_skill,
      difficulty: q.difficulty as Question['difficulty'],
      points: q.points
    };
  }

  // ---- Users / Profiles ----
  async getUser(id: string): Promise<User | undefined> {
    const rows = await query<any>(`SELECT * FROM users WHERE id = $1`, [id]);
    if (rows.length === 0) return undefined;
    const r = rows[0];
    return { id: r.id, email: r.email, role: r.role, createdAt: r.created_at };
  }

  async getProfile(userId: string): Promise<Profile | undefined> {
    const rows = await query<any>(`SELECT * FROM profiles WHERE user_id = $1`, [userId]);
    if (rows.length === 0) return undefined;
    const r = rows[0];
    return {
      id: r.id,
      userId: r.user_id,
      fullName: r.full_name,
      targetRoleId: r.target_role_id || undefined,
      githubUrl: r.github_url || undefined,
      portfolioUrl: r.portfolio_url || undefined,
      bio: r.bio || undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  }

  async saveProfile(userId: string, patch: Partial<Profile>): Promise<Profile | undefined> {
    const existing = await this.getProfile(userId);
    if (!existing) return undefined;
    const merged: Profile = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    await query(
      `UPDATE profiles SET full_name=$2, target_role_id=$3, github_url=$4, portfolio_url=$5, bio=$6, updated_at=$7::timestamptz
       WHERE user_id=$1`,
      [userId, merged.fullName, merged.targetRoleId || null, merged.githubUrl || null,
       merged.portfolioUrl || null, merged.bio || null, merged.updatedAt]
    );
    return merged;
  }

  // ---- Evidence ----
  async getEvidence(userId: string): Promise<SkillEvidence[]> {
    const rows = await query<any>(
      `SELECT * FROM skill_evidence WHERE user_id = $1 ORDER BY created_at`, [userId]
    );
    return rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      skillId: r.skill_id,
      sourceType: r.source_type,
      sourceId: r.source_id || undefined,
      proficiencyScore: Number(r.proficiency_score),
      confidence: r.confidence,
      metadata: r.metadata_json || undefined,
      createdAt: r.created_at
    }));
  }

  async saveEvidence(userId: string, list: SkillEvidence[]): Promise<SkillEvidence[]> {
    await withTransaction(async client => {
      for (const ev of list) {
        await client.query(
          `INSERT INTO skill_evidence
             (id, user_id, skill_id, source_type, source_id, proficiency_score, confidence, metadata_json, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::timestamptz)
           ON CONFLICT (user_id, skill_id, source_type)
           DO UPDATE SET source_id=EXCLUDED.source_id,
                         proficiency_score=EXCLUDED.proficiency_score,
                         confidence=EXCLUDED.confidence,
                         metadata_json=EXCLUDED.metadata_json,
                         created_at=EXCLUDED.created_at`,
          [ev.id, userId, ev.skillId, ev.sourceType, ev.sourceId || null,
           ev.proficiencyScore, ev.confidence,
           ev.metadata ? JSON.stringify(ev.metadata) : null, ev.createdAt]
        );
      }
    });
    return this.getEvidence(userId);
  }

  async upsertEvidence(ev: SkillEvidence): Promise<void> {
    await withTransaction(async client => {
      await client.query(
        `INSERT INTO skill_evidence
           (id, user_id, skill_id, source_type, source_id, proficiency_score, confidence, metadata_json, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::timestamptz)
         ON CONFLICT (user_id, skill_id, source_type)
         DO UPDATE SET source_id=EXCLUDED.source_id,
                       proficiency_score=EXCLUDED.proficiency_score,
                       confidence=EXCLUDED.confidence,
                       metadata_json=EXCLUDED.metadata_json,
                       created_at=EXCLUDED.created_at`,
        [ev.id, ev.userId, ev.skillId, ev.sourceType, ev.sourceId || null,
         ev.proficiencyScore, ev.confidence,
         ev.metadata ? JSON.stringify(ev.metadata) : null, ev.createdAt]
      );
    });
  }

  // ---- Skill gaps (persisted analysis) ----
  async saveGaps(userId: string, gaps: SkillGap[]): Promise<void> {
    if (gaps.length === 0) return;
    await withTransaction(async client => {
      for (const g of gaps) {
        await client.query(
          `INSERT INTO skill_gaps
             (id, user_id, role_id, skill_id, skill_name, priority_score, role_weight,
              market_demand, demonstrated_proficiency, explanation, status, calculated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::timestamptz)
           ON CONFLICT (user_id, role_id, skill_id) DO UPDATE SET
             skill_name=EXCLUDED.skill_name,
             priority_score=EXCLUDED.priority_score,
             role_weight=EXCLUDED.role_weight,
             market_demand=EXCLUDED.market_demand,
             demonstrated_proficiency=EXCLUDED.demonstrated_proficiency,
             explanation=EXCLUDED.explanation,
             status=EXCLUDED.status,
             calculated_at=EXCLUDED.calculated_at`,
          [g.id, userId, g.roleId, g.skillId, g.skillName, g.priorityScore, g.roleWeight,
           g.marketDemand, g.demonstratedProficiency, g.explanation, g.status,
           new Date().toISOString()]
        );
      }
    });
  }

  // ---- Recommendations ----
  async getRecommendations(userId: string): Promise<ActionRecommendation[]> {
    const rows = await query<RecRow>(
      `SELECT * FROM recommendations WHERE user_id = $1 ORDER BY estimated_hours DESC`, [userId]
    );
    return rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      type: r.type as ActionRecommendation['type'],
      title: r.title,
      description: r.description,
      targetSkillIds: r.target_skill_ids || [],
      targetSkillNames: r.target_skill_names || [],
      estimatedHours: r.estimated_hours,
      priorityLevel: r.priority_level as ActionRecommendation['priorityLevel'],
      status: r.status as ActionRecommendation['status']
    }));
  }

  async updateRecommendationStatus(userId: string, id: string, status: string): Promise<void> {
    await query(
      `UPDATE recommendations SET status = $3 WHERE user_id = $1 AND id = $2`,
      [userId, id, status]
    );
  }

  // ---- Projects (portfolio evidence) ----
  async getProjects(userId: string): Promise<ProjectEvidence[]> {
    const rows = await query<ProjectRow>(
      `SELECT * FROM projects WHERE user_id = $1 ORDER BY submitted_at`, [userId]
    );
    return rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      title: r.title,
      repoUrl: r.repo_url,
      description: r.description,
      primarySkills: r.primary_skills || [],
      detectedStack: r.detected_stack || [],
      hasTests: r.has_tests,
      hasDocker: r.has_docker,
      hasReadme: r.has_readme,
      commitCountEstimate: r.commit_count_estimate,
      verificationStatus: r.verification_status as ProjectEvidence['verificationStatus'],
      submittedAt: r.submitted_at
    }));
  }

  async saveProjects(userId: string, list: ProjectEvidence[]): Promise<ProjectEvidence[]> {
    await withTransaction(async client => {
      for (const p of list) {
        await client.query(
          `INSERT INTO projects
             (id, user_id, title, repo_url, description, primary_skills, detected_stack,
              has_tests, has_docker, has_readme, commit_count_estimate, verification_status, submitted_at)
           VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,$9,$10,$11,$12,$13::timestamptz)
           ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, repo_url=EXCLUDED.repo_url,
             description=EXCLUDED.description, primary_skills=EXCLUDED.primary_skills,
             detected_stack=EXCLUDED.detected_stack, has_tests=EXCLUDED.has_tests,
             has_docker=EXCLUDED.has_docker, has_readme=EXCLUDED.has_readme,
             commit_count_estimate=EXCLUDED.commit_count_estimate,
             verification_status=EXCLUDED.verification_status`,
          [p.id, userId, p.title, p.repoUrl, p.description,
           JSON.stringify(p.primarySkills), JSON.stringify(p.detectedStack),
           p.hasTests, p.hasDocker, p.hasReadme, p.commitCountEstimate,
           p.verificationStatus, p.submittedAt]
        );
      }
    });
    return this.getProjects(userId);
  }

  // ---- Attempts ----
  async saveAttempt(attempt: AssessmentAttempt): Promise<void> {
    await query(
      `INSERT INTO assessment_attempts
         (id, user_id, assessment_id, started_at, completed_at, score, total_points_earned,
          max_points, passed, sub_skill_scores_json, status)
       VALUES ($1,$2,$3,$4::timestamptz,$5::timestamptz,$6,$7,$8,$9,$10::jsonb,$11)
       ON CONFLICT (id) DO UPDATE SET score=EXCLUDED.score,
         total_points_earned=EXCLUDED.total_points_earned, max_points=EXCLUDED.max_points,
         passed=EXCLUDED.passed, sub_skill_scores_json=EXCLUDED.sub_skill_scores_json,
         status=EXCLUDED.status, completed_at=EXCLUDED.completed_at`,
      [attempt.id, attempt.userId, attempt.assessmentId, attempt.startedAt,
       attempt.completedAt || null, attempt.score, attempt.totalPointsEarned,
       attempt.maxPoints, attempt.passed, JSON.stringify(attempt.subSkillScores), attempt.status]
    );
  }

  async getAttemptsCount(): Promise<number> {
    const rows = await query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM assessment_attempts`);
    return Number(rows[0]?.c || 0);
  }

  // ---- Jobs ----
  async getJobs(): Promise<JobListing[]> {
    const skillRows = await query<any>(
      `SELECT js.job_id, js.skill_id, js.is_required FROM job_skills js ORDER BY js.job_id`
    );
    const reqMap = new Map<string, string[]>();
    const prefMap = new Map<string, string[]>();
    for (const sk of skillRows) {
      const arr = sk.is_required
        ? (reqMap.get(sk.job_id) || (reqMap.set(sk.job_id, []), reqMap.get(sk.job_id)!))
        : (prefMap.get(sk.job_id) || (prefMap.set(sk.job_id, []), prefMap.get(sk.job_id)!));
      arr.push(sk.skill_id);
    }

    const rows = await query<any>(`SELECT * FROM jobs ORDER BY id`);
    return rows.map(j => ({
      id: j.id,
      title: j.title,
      company: j.company,
      location: j.location || '',
      experienceLevel: j.experience_level || '',
      roleId: j.role_id,
      description: j.description,
      requiredSkillIds: reqMap.get(j.id) || [],
      preferredSkillIds: prefMap.get(j.id) || [],
      postedAt: j.posted_at
    }));
  }

  // ---- Job matches (persisted analysis) ----
  async saveJobMatches(userId: string, results: JobMatchResult[]): Promise<void> {
    if (results.length === 0) return;
    await withTransaction(async client => {
      for (const r of results) {
        await client.query(
          `INSERT INTO job_matches
             (user_id, job_id, match_score, matched_skills, missing_skills, explanation, calculated_at)
           VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7::timestamptz)`,
          [userId, r.job.id, r.matchScore,
           JSON.stringify(r.matchedSkills), JSON.stringify(r.missingSkills),
           r.explanation, new Date().toISOString()]
        );
      }
    });
  }

  // ---- Admin ops ----
  async getAliasTotal(): Promise<number> {
    const rows = await query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM skill_aliases`);
    return Number(rows[0]?.c || 0);
  }

  async addAlias(skillId: string, alias: string): Promise<void> {
    await query(
      `INSERT INTO skill_aliases (skill_id, alias) VALUES ($1,$2)
       ON CONFLICT (skill_id, alias) DO NOTHING`,
      [skillId, alias]
    );
  }

  async updateRoleSkillWeights(
    roleId: string,
    skillId: string,
    opts: { roleWeight?: number; marketDemandFrequency?: number }
  ): Promise<void> {
    await query(
      `UPDATE role_skills SET
         role_weight = COALESCE($3, role_weight),
         market_demand_frequency = COALESCE($4, market_demand_frequency)
       WHERE role_id = $1 AND skill_id = $2`,
      [roleId, skillId, opts.roleWeight ?? null, opts.marketDemandFrequency ?? null]
    );
  }

  async addQuestion(q: Question): Promise<void> {
    await query(
      `INSERT INTO questions
         (id, assessment_id, prompt, code_snippet, question_type, options_json, correct_answer,
          explanation, sub_skill, difficulty, points)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO NOTHING`,
      [q.id, q.assessmentId, q.prompt, q.codeSnippet || null, q.questionType,
       q.options ? JSON.stringify(q.options) : null, q.correctAnswer,
       q.explanation, q.subSkill, q.difficulty, q.points]
    );
  }
}

function rowToRole(row: RoleRow, skillRows: RoleSkillRowFull[], skillMap: Map<string, Skill>): Role {
  const roleSkills: RoleSkill[] = skillRows.map(r => ({
    skillId: r.skill_id,
    required: Boolean(r.is_required),
    roleWeight: Number(r.role_weight),
    marketDemandFrequency: Number(r.market_demand_frequency),
    proficiencyTarget: mapProficiency(r.proficiency_target),
    skill: skillMap.get(r.skill_id)
  }));
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    description: row.description,
    marketContext: row.market_context || { region: '', experienceLevel: '', typicalTitles: [] },
    roleSkills
  };
}

export const store = new AppDataStore();
