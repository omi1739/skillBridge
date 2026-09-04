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
    return {
      id: r.id,
      email: r.email,
      role: r.role,
      currentStatus: r.current_status || undefined,
      googleId: r.google_id || undefined,
      provider: r.provider || 'EMAIL',
      createdAt: r.created_at
    };
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

  /**
   * Replaces all recommendations for a user with the given list (used by the
   * dynamic recommendation engine that derives them from live skill gaps).
   */
  async saveRecommendations(userId: string, recs: ActionRecommendation[]): Promise<void> {
    await query(`DELETE FROM recommendations WHERE user_id = $1`, [userId]);
    for (const rec of recs) {
      await query(
        `INSERT INTO recommendations
           (id, user_id, type, title, description, target_skill_ids, target_skill_names, estimated_hours, priority_level, status)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,$9,$10)`,
        [rec.id, userId, rec.type, rec.title, rec.description,
         JSON.stringify(rec.targetSkillIds), JSON.stringify(rec.targetSkillNames),
         rec.estimatedHours, rec.priorityLevel, rec.status]
      );
    }
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
  async getJobs(sort: 'priority' | 'recent' = 'priority'): Promise<JobListing[]> {
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

    // Bangladesh keyword set (cities/areas + country). Drives the "Bangladesh first" default sort.
    const bdExpr = `(LOWER(COALESCE(j.location,'')) ~ 'dhaka|bangladesh|gulshan|dhanmondi|tejgaon|baridhara|banani|bashundhara|uttara|mirpur|motijheel|mogbazar|badda|agargaon|farmgate|chittagong|sylhet|khulna|rajshahi|rangpur|mymensingh|comilla|cumilla|barisal|bogra|jashore|gazipur|narayanganj|cox''?s bazar')`;
    const orderClause = sort === 'recent'
      ? `j.posted_at DESC NULLS LAST, j.id`
      : `CASE
           WHEN ${bdExpr} AND NOT COALESCE(j.is_remote, false) THEN 1
           WHEN COALESCE(j.is_remote, false) THEN 2
           ELSE 3
         END,
         j.posted_at DESC NULLS LAST, j.id`;

    const rows = await query<any>(
      `SELECT j.*, s.name AS source_name, s.access_method AS source_access_method,
              ${bdExpr} AS is_bd
       FROM jobs j
       LEFT JOIN job_sources s ON s.id = j.source_id
       ORDER BY ${orderClause}`
    );
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
      postedAt: j.posted_at,
      sourceName: j.source_name || undefined,
      sourceUrl: j.posting_url || undefined,
      sourceAccessMethod: j.source_access_method || undefined,
      externalId: j.external_id || undefined,
      verificationStatus: j.verification_status || 'UNVERIFIED',
      lastVerifiedAt: j.last_verified_at || null,
      isRemote: j.is_remote ? true : false,
      isBangladesh: j.is_bd ? true : false
    }));
  }

  async getJobSources(): Promise<any[]> {
    const rows = await query<any>(
      `SELECT s.*, COUNT(j.id)::int AS job_count
       FROM job_sources s
       LEFT JOIN jobs j ON j.source_id = s.id
       GROUP BY s.id
       ORDER BY s.name`
    );
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      sourceType: r.source_type || r.access_method || 'API',
      website: r.website || undefined,
      apiUrl: r.api_url || undefined,
      feedUrl: r.feed_url || undefined,
      careerUrl: r.career_url || undefined,
      accessMethod: r.access_method,
      crawlAllowed: r.crawl_allowed ?? false,
      redistributionAllowed: r.redistribution_allowed ?? false,
      permissionStatus: r.permission_status || 'PENDING',
      permissionReference: r.permission_reference || undefined,
      licenseNotes: r.license_notes || undefined,
      isActive: r.is_active,
      lastSyncedAt: r.last_synced_at || null,
      jobCount: r.job_count
    }));
  }

  async addJobSource(data: {
    name: string;
    sourceType?: string;
    accessMethod: string;
    website?: string;
    apiUrl?: string;
    feedUrl?: string;
    careerUrl?: string;
    crawlAllowed?: boolean;
    redistributionAllowed?: boolean;
    permissionStatus?: string;
    permissionReference?: string;
    licenseNotes?: string;
  }): Promise<any> {
    const rows = await query<any>(
      `INSERT INTO job_sources
         (name, source_type, access_method, website, api_url, feed_url, career_url,
          crawl_allowed, redistribution_allowed, permission_status, permission_reference, license_notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (name) DO UPDATE SET
         source_type=EXCLUDED.source_type, access_method=EXCLUDED.access_method,
         website=EXCLUDED.website, api_url=EXCLUDED.api_url, feed_url=EXCLUDED.feed_url,
         career_url=EXCLUDED.career_url, crawl_allowed=EXCLUDED.crawl_allowed,
         redistribution_allowed=EXCLUDED.redistribution_allowed,
         permission_status=EXCLUDED.permission_status,
         permission_reference=EXCLUDED.permission_reference,
         license_notes=EXCLUDED.license_notes,
         updated_at=CURRENT_TIMESTAMP
       RETURNING id`,
      [data.name, data.sourceType || 'API', data.accessMethod,
       data.website || null, data.apiUrl || null, data.feedUrl || null,
       data.careerUrl || null, data.crawlAllowed ?? false,
       data.redistributionAllowed ?? false, data.permissionStatus || 'PENDING',
       data.permissionReference || null, data.licenseNotes || null]
    );
    return { id: rows[0].id };
  }

  async updateJobSource(sourceId: string, patch: Partial<{
    isActive: boolean;
    permissionStatus: string;
    crawlAllowed: boolean;
    redistributionAllowed: boolean;
    website: string;
    apiUrl: string;
    feedUrl: string;
    careerUrl: string;
    permissionReference: string;
    licenseNotes: string;
  }>): Promise<void> {
    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 1;
    const push = (col: string, val: any) => {
      sets.push(`${col} = $${idx++}`);
      vals.push(val);
    };
    if (typeof patch.isActive === 'boolean') push('is_active', patch.isActive);
    if (patch.permissionStatus) push('permission_status', patch.permissionStatus);
    if (typeof patch.crawlAllowed === 'boolean') push('crawl_allowed', patch.crawlAllowed);
    if (typeof patch.redistributionAllowed === 'boolean') push('redistribution_allowed', patch.redistributionAllowed);
    if (patch.website !== undefined) push('website', patch.website);
    if (patch.apiUrl !== undefined) push('api_url', patch.apiUrl);
    if (patch.feedUrl !== undefined) push('feed_url', patch.feedUrl);
    if (patch.careerUrl !== undefined) push('career_url', patch.careerUrl);
    if (patch.permissionReference !== undefined) push('permission_reference', patch.permissionReference);
    if (patch.licenseNotes !== undefined) push('license_notes', patch.licenseNotes);
    sets.push('updated_at = CURRENT_TIMESTAMP');
    vals.push(sourceId);
    if (sets.length === 1) return;
    await query(`UPDATE job_sources SET ${sets.join(', ')} WHERE id = $${idx}`, vals);
  }

  async deleteJobSource(sourceId: string): Promise<void> {
    await query(`DELETE FROM job_sources WHERE id = $1`, [sourceId]);
  }

  async deleteJobsBySource(sourceId: string): Promise<number> {
    const rows = await query<{ c: string }>(
      `WITH removed AS (DELETE FROM jobs WHERE source_id = $1 AND source_id IS NOT NULL RETURNING id)
       SELECT COUNT(*)::text AS c FROM removed`,
      [sourceId]
    );
    return Number(rows[0]?.c || 0);
  }

  async deleteJobById(jobId: string): Promise<boolean> {
    const rows = await query<{ c: string }>(
      `WITH removed AS (DELETE FROM jobs WHERE id = $1 RETURNING id)
       SELECT COUNT(*)::text AS c FROM removed`,
      [jobId]
    );
    return Number(rows[0]?.c || 0) > 0;
  }

  async markJobsAsVerified(sourceId: string): Promise<number> {
    const rows = await query<{ c: string }>(
      `UPDATE jobs
       SET verification_status = 'SOURCE_VERIFIED', last_verified_at = CURRENT_TIMESTAMP
       WHERE source_id = $1 AND verification_status != 'EMPLOYER_VERIFIED'
       RETURNING id`,
      [sourceId]
    );
    return rows.length;
  }

  async markSourceSynced(sourceId: string): Promise<void> {
    await query(
      `UPDATE job_sources SET last_synced_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [sourceId]
    );
  }

  async runVerificationSweep(): Promise<{ deleted: number; recentlyChecked: number; verified: number }> {
    const RECENT_INTERVAL = "48 hours";

    // Retain ingested listings for this many days since last verification, then
    // permanently remove them. Defaults to 4 (keeps job-plan growth bounded so
    // the table never fills up). EMPLOYER_VERIFIED postings are always kept.
    const retentionDays = Number(process.env.JOB_RETENTION_DAYS || 4) || 4;
    const retentionInterval = `${retentionDays} days`;

    // Purge stale listings: source became inactive OR not re-verified within
    // the retention window. Never remove recruiter-hosted (EMPLOYER_VERIFIED) jobs.
    const deleted = await query<{ c: string }>(
      `WITH purged AS (
         DELETE FROM jobs
         WHERE (
           source_id IS NOT NULL AND NOT EXISTS (
             SELECT 1 FROM job_sources s WHERE s.id = jobs.source_id AND s.is_active
           )
           OR
           (last_verified_at IS NOT NULL AND last_verified_at < CURRENT_TIMESTAMP - INTERVAL '${retentionInterval}')
         )
         AND verification_status != 'EMPLOYER_VERIFIED'
         RETURNING id
       )
       SELECT COUNT(*)::text AS c FROM purged`
    );

    // RECENTLY_CHECKED: source is active AND last_verified_at within 48h
    const recent = await query<{ c: string }>(
      `WITH updated AS (
         UPDATE jobs SET verification_status = 'RECENTLY_CHECKED'
         WHERE source_id IN (SELECT id FROM job_sources WHERE is_active)
           AND last_verified_at >= CURRENT_TIMESTAMP - INTERVAL '${RECENT_INTERVAL}'
           AND verification_status = 'SOURCE_VERIFIED'
         RETURNING id
       )
       SELECT COUNT(*)::text AS c FROM updated`
    );

    // SOURCE_VERIFIED: source is active AND last_verified_at > 48h ago
    const verified = await query<{ c: string }>(
      `WITH updated AS (
         UPDATE jobs SET verification_status = 'SOURCE_VERIFIED'
         WHERE source_id IN (SELECT id FROM job_sources WHERE is_active)
           AND (last_verified_at IS NULL OR last_verified_at < CURRENT_TIMESTAMP - INTERVAL '${RECENT_INTERVAL}')
           AND verification_status = 'RECENTLY_CHECKED'
         RETURNING id
       )
       SELECT COUNT(*)::text AS c FROM updated`
    );

    return {
      deleted: Number(deleted[0]?.c || 0),
      recentlyChecked: Number(recent[0]?.c || 0),
      verified: Number(verified[0]?.c || 0)
    };
  }

  // --- User Management ---

  async getAllUsers(options?: { page?: number; pageSize?: number; search?: string }): Promise<{
    items: Array<{
      id: string;
      email: string;
      role: string;
      currentStatus: string | null;
      provider: string;
      googleId: string | null;
      createdAt: string;
      updatedAt: string | null;
      fullName: string | null;
      hasPassword: boolean;
    }>;
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const page = Math.max(1, Number(options?.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(options?.pageSize) || 10));
    const search = (options?.search || '').trim().toLowerCase();

    const whereClause = search
      ? `WHERE LOWER(u.email) LIKE $1 OR LOWER(p.full_name) LIKE $1`
      : '';
    const params: any[] = search ? [`%${search}%`] : [];

    const countRows = await query<{ c: string }>(
      `SELECT COUNT(*)::text AS c
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       ${whereClause}`,
      params
    );
    const total = Number(countRows[0]?.c || 0);

    const offset = (page - 1) * pageSize;
    const paramList: any[] = [...params, pageSize, offset];
    const rows = await query<any>(
      `SELECT u.id, u.email, u.role, u.current_status, u.provider, u.google_id,
              u.created_at, u.updated_at,
              p.full_name,
              (u.password_hash IS NOT NULL AND u.password_hash != '') AS has_password
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      paramList
    );

    return {
      items: rows.map(r => ({
        id: r.id,
        email: r.email,
        role: r.role || 'USER',
        currentStatus: r.current_status || null,
        provider: r.provider || 'EMAIL',
        googleId: r.google_id || null,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date(0).toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : null,
        fullName: r.full_name || null,
        hasPassword: Boolean(r.has_password)
      })),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    };
  }

  async countAdmins(): Promise<number> {
    const rows = await query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM users WHERE role = 'ADMIN'`
    );
    return Number(rows[0]?.c || 0);
  }

  async getUserById(id: string): Promise<{
    id: string;
    email: string;
    role: string;
    provider: string;
  } | null> {
    const rows = await query<any>(
      `SELECT id, email, role, provider FROM users WHERE id = $1`,
      [id]
    );
    if (!rows[0]) return null;
    return {
      id: rows[0].id,
      email: rows[0].email,
      role: rows[0].role || 'USER',
      provider: rows[0].provider || 'EMAIL'
    };
  }

  async updateUserRole(userId: string, role: string): Promise<boolean> {
    const rows = await query<any>(
      `UPDATE users SET role = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id`,
      [userId, role]
    );
    return rows.length > 0;
  }

  async deleteUserById(userId: string): Promise<boolean> {
    const rows = await query<any>(
      `WITH deleted AS (DELETE FROM users WHERE id = $1 RETURNING id)
       SELECT COUNT(*)::text AS c FROM deleted`,
      [userId]
    );
    return Number(rows[0]?.c || 0) > 0;
  }

  async ensureJobSource(name: string, accessMethod: string, licenseNotes?: string, extra?: Partial<{
    sourceType: string;
    website: string;
    apiUrl: string;
    feedUrl: string;
    careerUrl: string;
    crawlAllowed: boolean;
    redistributionAllowed: boolean;
    permissionStatus: string;
  }>): Promise<string> {
    const rows = await query<any>(
      `INSERT INTO job_sources
         (name, access_method, license_notes, is_active, source_type, website, api_url, feed_url, career_url, crawl_allowed, redistribution_allowed, permission_status)
       VALUES ($1,$2,$3,true,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (name) DO UPDATE SET
         access_method=EXCLUDED.access_method,
         license_notes=EXCLUDED.license_notes,
         source_type=COALESCE(EXCLUDED.source_type, job_sources.source_type),
         website=COALESCE(EXCLUDED.website, job_sources.website),
         api_url=COALESCE(EXCLUDED.api_url, job_sources.api_url),
         feed_url=COALESCE(EXCLUDED.feed_url, job_sources.feed_url),
         career_url=COALESCE(EXCLUDED.career_url, job_sources.career_url),
         updated_at=CURRENT_TIMESTAMP
       RETURNING id`,
      [name, accessMethod, licenseNotes || null,
       extra?.sourceType || 'API', extra?.website || null, extra?.apiUrl || null,
       extra?.feedUrl || null, extra?.careerUrl || null,
       extra?.crawlAllowed ?? false, extra?.redistributionAllowed ?? false,
       extra?.permissionStatus || 'PENDING']
    );
    return rows[0].id;
  }

  async upsertJobs(jobs: Array<{
    externalId: string;
    sourceId: string;
    title: string;
    company: string;
    location: string;
    experienceLevel: string;
    roleId: string;
    description: string;
    postingUrl: string;
    postedAt?: string;
    isRemote?: boolean;
    requiredSkillIds?: string[];
    preferredSkillIds?: string[];
  }>): Promise<{ inserted: number; updated: number }> {
    let inserted = 0;
    let updated = 0;
    await withTransaction(async client => {
      for (const j of jobs) {
        const id = `job_src_${this.effectiveCompanyKey(j)}_${this.hashExternal(j.externalId)}`;
        const upsert = await client.query(
          `INSERT INTO jobs
             (id, source_id, external_id, title, company, location, experience_level, role_id, description, posting_url, posted_at, is_remote, verification_status, last_verified_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::timestamptz,$12::boolean,'SOURCE_VERIFIED',CURRENT_TIMESTAMP)
           ON CONFLICT (source_id, external_id)
           DO UPDATE SET title=EXCLUDED.title, company=EXCLUDED.company,
             location=EXCLUDED.location, experience_level=EXCLUDED.experience_level,
             role_id=EXCLUDED.role_id, description=EXCLUDED.description,
             posting_url=EXCLUDED.posting_url, posted_at=EXCLUDED.posted_at,
             is_remote=EXCLUDED.is_remote,
             verification_status='SOURCE_VERIFIED', last_verified_at=CURRENT_TIMESTAMP
           RETURNING (xmax = 0) AS freshly_inserted`,
          [id, j.sourceId, j.externalId, j.title, j.company, j.location,
           j.experienceLevel, j.roleId, j.description, j.postingUrl,
           j.postedAt || new Date().toISOString(),
           j.isRemote ? true : false]
        );
        if (upsert.rows[0]?.freshly_inserted) inserted++;
        else if (upsert.rows.length) updated++;
        const existing = await client.query(
          `SELECT id FROM jobs WHERE source_id=$1 AND external_id=$2`,
          [j.sourceId, j.externalId]
        );
        const jobId = (existing.rows[0]?.id) || id;
        await client.query(`DELETE FROM job_skills WHERE job_id=$1`, [jobId]);
        for (const sId of j.requiredSkillIds || []) {
          await client.query(
            `INSERT INTO job_skills (job_id, skill_id, is_required) VALUES ($1,$2,true) ON CONFLICT (job_id, skill_id) DO NOTHING`,
            [jobId, sId]
          );
        }
        for (const sId of j.preferredSkillIds || []) {
          await client.query(
            `INSERT INTO job_skills (job_id, skill_id, is_required) VALUES ($1,$2,false) ON CONFLICT (job_id, skill_id) DO NOTHING`,
            [jobId, sId]
          );
        }
      }
    });
    return { inserted, updated };
  }

  async getJobsForRole(roleId: string): Promise<JobListing[]> {
    const all = await this.getJobs();
    return all.filter(j => j.roleId === roleId);
  }

  private effectiveCompanyKey(j: { company: string }): string {
    // Deterministic short key so a real job keeps a stable, readable id.
    return (j.company || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 24);
  }

  private hashExternal(id: string): string {
    let h = 0;
    for (let i = 0; i < id.length; i++) {
      h = ((h << 5) - h + id.charCodeAt(i)) | 0;
    }
    return Math.abs(h).toString(36);
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

  // ---- Market demand (recomputed from real job postings) ----
  async recomputeMarketDemand(): Promise<{ updatedRoles: number; totalJobs: number }> {
    const roleCounts = await query<{ role_id: string; total_jobs: string }>(
      `SELECT role_id, COUNT(*)::text AS total_jobs
       FROM jobs
       WHERE role_id IS NOT NULL
       GROUP BY role_id`
    );
    const totalJobs = roleCounts.reduce((sum, r) => sum + Number(r.total_jobs), 0);
    let updatedRoles = 0;

    for (const rc of roleCounts) {
      const total = Number(rc.total_jobs);
      if (total === 0) continue;
      const skillCounts = await query<{ skill_id: string; cnt: string }>(
        `SELECT js.skill_id, COUNT(*)::text AS cnt
         FROM job_skills js
         JOIN jobs j ON j.id = js.job_id
         WHERE j.role_id = $1
         GROUP BY js.skill_id`,
        [rc.role_id]
      );
      await withTransaction(async client => {
        for (const sc of skillCounts) {
          const freq = Number(sc.cnt) / total;
          await client.query(
            `UPDATE role_skills SET market_demand_frequency = $3
             WHERE role_id = $1 AND skill_id = $2`,
            [rc.role_id, sc.skill_id, Number(freq.toFixed(2))]
          );
        }
      });
      updatedRoles++;
    }

    return { updatedRoles, totalJobs };
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
