import * as fs from 'fs';
import * as path from 'path';
import {
  Skill,
  Role,
  Assessment,
  User,
  Profile,
  SkillEvidence
} from '@skillbridge/types';
import {
  INITIAL_SKILLS,
  INITIAL_ROLES,
  INITIAL_ASSESSMENT
} from '../data/seed';
import {
  SKILL_BANK_TOPICS,
  SKILL_BANK_QUESTIONS
} from '../data/skill-bank.seed';
import { query, withTransaction } from './client';
import { authService } from '../services/auth.service';
import { DEMO_USER_ID, DEMO_EMAIL } from '../common/demo-access';

const SCHEMA_PATH = path.resolve(__dirname, '../../../docs/architecture/schema.sql');

export async function applySchema(): Promise<void> {
  const sql = fs.readFileSync(SCHEMA_PATH, 'utf8');
  await query(sql.replace(/;/g, ';\n'));
  console.log('[SkillBridge DB] Schema applied.');
}

/**
 * Production never falls back to a well-known default password. In production
 * the bootstrap passwords must come from the environment; in any other
 * environment a documented dev default is fine. Returns a bcrypt hash, or
 * undefined when the account should be skipped.
 */
async function seedPasswordHash(envVar: string, devFallback: string): Promise<string | undefined> {
  if (process.env.NODE_ENV === 'production' && !process.env[envVar]) {
    console.warn(`[SkillBridge DB] Skipping seed account (${envVar} not set in production).`);
    return undefined;
  }
  const secret = process.env[envVar] || devFallback;
  return authService.hashPassword(secret);
}

export async function seedAll(): Promise<void> {
  // Demo + staff identities are a development convenience. They must never be
  // created or re-seeded into production unless SEED_DEMO_USERS=true is set
  // as an explicit override (default: non-production only).
  const demoSeedEnabled =
    process.env.SEED_DEMO_USERS !== undefined
      ? process.env.SEED_DEMO_USERS === 'true'
      : process.env.NODE_ENV !== 'production';
  await withTransaction(async client => {
    // --- Skills + aliases + prerequisites ---
    for (const s of INITIAL_SKILLS) {
      await client.query(
        `INSERT INTO skills (id, canonical_name, category, description, prerequisites)
         VALUES ($1,$2,$3,$4,$5::jsonb)
         ON CONFLICT (id) DO NOTHING`,
        [s.id, s.canonicalName, s.category, s.description, JSON.stringify(s.prerequisites || [])]
      );
      for (const alias of s.aliases || []) {
        await client.query(
          `INSERT INTO skill_aliases (skill_id, alias) VALUES ($1,$2)
           ON CONFLICT (skill_id, alias) DO NOTHING`,
          [s.id, alias]
        );
      }
    }

    // --- Roles + role_skills ---
    for (const r of INITIAL_ROLES) {
      await client.query(
        `INSERT INTO roles (id, slug, title, category, description, market_context)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb)
         ON CONFLICT (id) DO NOTHING`,
        [r.id, r.slug, r.title, r.category, r.description, JSON.stringify(r.marketContext || {})]
      );
      for (const rs of r.roleSkills) {
        await client.query(
          `INSERT INTO role_skills (role_id, skill_id, is_required, role_weight, market_demand_frequency, proficiency_target)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (role_id, skill_id) DO NOTHING`,
          [r.id, rs.skillId, rs.required, rs.roleWeight, rs.marketDemandFrequency, rs.proficiencyTarget]
        );
      }
    }

    // --- Assessment + questions ---
    const a = INITIAL_ASSESSMENT;
    await client.query(
      `INSERT INTO assessments (id, skill_id, title, description, time_limit_minutes, passing_score, version)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO NOTHING`,
      [a.id, a.skillId || null, a.title, a.description, a.timeLimitMinutes, a.passingScore, a.version]
    );
    for (const q of a.questions || []) {
      await client.query(
        `INSERT INTO questions (id, assessment_id, prompt, code_snippet, question_type, options_json, correct_answer, explanation, sub_skill, difficulty, points)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11)
         ON CONFLICT (id) DO NOTHING`,
        [q.id, a.id, q.prompt, q.codeSnippet || null, q.questionType,
         q.options ? JSON.stringify(q.options) : null, q.correctAnswer,
         q.explanation, q.subSkill, q.difficulty, q.points]
      );
    }

    // --- Skill assessment: topics + question bank ---
    for (const t of SKILL_BANK_TOPICS) {
      await client.query(
        `INSERT INTO skill_topics (id, skill_id, name, description)
         VALUES ($1,$2,$3,$4) ON CONFLICT (skill_id, name) DO NOTHING`,
        [t.id, t.skillId, t.name, t.description || null]
      );
    }
    for (const q of SKILL_BANK_QUESTIONS) {
      await client.query(
        `INSERT INTO questions
           (id, assessment_id, prompt, code_snippet, question_type, options_json, correct_answer,
            explanation, sub_skill, difficulty, points, skill_id, topic, verification_status,
            question_text, is_multiple_select, created_by)
         VALUES ($1, NULL, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, $11, $12, 'approved', $13, $14, 'seed')
         ON CONFLICT (id) DO NOTHING`,
        [
          q.id,
          q.questionText,
          q.codeSnippet || null,
          q.questionType,
          q.options ? JSON.stringify(q.options) : null,
          Array.isArray(q.correctAnswer) ? JSON.stringify(q.correctAnswer) : q.correctAnswer,
          q.explanation,
          q.topic,
          q.difficulty,
          q.difficulty === 'easy' ? 1 : q.difficulty === 'hard' ? 3 : 2,
          q.skillId,
          q.topic,
          q.questionText,
          q.questionType === 'multiple_select'
        ]
      );
    }

    // --- Demo user + profile ---
    // Demo login: candidate@skillbridge.org / SkillBridge@123
    // DO NOTHING on conflict: never overwrite a real (possibly password-reset
    // or role-changed) account that already exists.
    if (!demoSeedEnabled) {
      return;
    }
    const demoPasswordHash = await authService.hashPassword('SkillBridge@123');
    const demoUser: User = {
      id: DEMO_USER_ID,
      email: DEMO_EMAIL,
      role: 'USER',
      createdAt: new Date().toISOString()
    };
    await client.query(
      `INSERT INTO users (id, email, password_hash, role, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5::timestamptz,$5::timestamptz)
       ON CONFLICT (id) DO NOTHING`,
      [demoUser.id, demoUser.email, demoPasswordHash, demoUser.role, demoUser.createdAt]
    );

    const demoProfile: Profile = {
      id: 'profile_01',
      userId: DEMO_USER_ID,
      fullName: 'Ayman Rahman',
      targetRoleId: 'role_full_stack',
      githubUrl: 'https://github.com/ayman-rahman',
      portfolioUrl: '',
      bio: 'Aspiring software engineer eager to master web development across frontend and backend.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await client.query(
      `INSERT INTO profiles (id, user_id, full_name, target_role_id, github_url, portfolio_url, bio, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::timestamptz,$9::timestamptz)
       ON CONFLICT (id) DO NOTHING`,
      [demoProfile.id, demoProfile.userId, demoProfile.fullName,
       demoProfile.targetRoleId || null, demoProfile.githubUrl || null,
       demoProfile.portfolioUrl || null, demoProfile.bio || null,
       demoProfile.createdAt, demoProfile.updatedAt]
    );

    // --- Admin + Recruiter + Owner (real role separation, login-testable) ---
    //   Admin:      admin@skillbridge.org        (role ADMIN)     password via SEED_ADMIN_PASSWORD
    //   Recruiter:  recruiter@skillbridge.org    (role RECRUITER) password via SEED_RECRUITER_PASSWORD
    //   Owner:      seyam.islam020@gmail.com     (role ADMIN)     password via SEED_OWNER_PASSWORD
    // The owner's bootstrap password is never hardcoded — provision it through
    // SEED_OWNER_PASSWORD to seed that account.
    const adminHash = await seedPasswordHash('SEED_ADMIN_PASSWORD', 'AdminBridge@123');
    const recruiterHash = await seedPasswordHash('SEED_RECRUITER_PASSWORD', 'RecruitBridge@123');
    const ownerHash = await seedPasswordHash('SEED_OWNER_PASSWORD', '');
    const staffUsers = [
      {
        user: { id: 'admin_user_01', email: 'admin@skillbridge.org', role: 'ADMIN', createdAt: new Date().toISOString() } as User,
        profile: {
          id: 'profile_admin_01', userId: 'admin_user_01', fullName: 'SkillBridge Admin',
          targetRoleId: 'role_full_stack', githubUrl: '', portfolioUrl: '',
          bio: 'Platform administrator responsible for the skill ontology and role weight tuning.',
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        } as Profile,
        hash: adminHash
      },
      {
        user: { id: 'owner_user_01', email: 'seyam.islam020@gmail.com', role: 'ADMIN', currentStatus: 'STUDENT', provider: 'EMAIL', createdAt: new Date().toISOString() } as User,
        profile: {
          id: 'profile_owner_01', userId: 'owner_user_01', fullName: 'Seyam Islam',
          targetRoleId: 'role_full_stack', githubUrl: '', portfolioUrl: '',
          bio: 'SkillBridge platform owner and administrator.',
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        } as Profile,
        hash: ownerHash
      },
      {
        user: { id: 'recruiter_user_01', email: 'recruiter@skillbridge.org', role: 'RECRUITER', createdAt: new Date().toISOString() } as User,
        profile: {
          id: 'profile_recruiter_01', userId: 'recruiter_user_01', fullName: 'Talent Acquisition Partner',
          targetRoleId: 'role_full_stack', githubUrl: '', portfolioUrl: '',
          bio: 'Recruiter reviewing candidate skill passports and job matches.',
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        } as Profile,
        hash: recruiterHash
      }
    ].filter(s => s.hash !== undefined);
    for (const staff of staffUsers) {
      const u = staff.user;
      await client.query(
        `INSERT INTO users (id, email, password_hash, role, current_status, provider, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7::timestamptz,$7::timestamptz)
         ON CONFLICT (id) DO NOTHING`,
        [u.id, u.email, staff.hash, u.role, u.currentStatus || null, u.provider || 'EMAIL', u.createdAt]
      );
      const p = staff.profile;
      await client.query(
        `INSERT INTO profiles (id, user_id, full_name, target_role_id, github_url, portfolio_url, bio, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8::timestamptz,$9::timestamptz)
         ON CONFLICT (id) DO NOTHING`,
        [p.id, p.userId, p.fullName, p.targetRoleId || null, p.githubUrl || null,
         p.portfolioUrl || null, p.bio || null, p.createdAt, p.updatedAt]
      );
    }

    // --- Demo self-reported evidence ---
    const nowIso = new Date().toISOString();
    const initialEvidence: SkillEvidence[] = [
      {
        id: 'ev_01', userId: 'demo_user_01', skillId: 'skill_javascript',
        sourceType: 'SELF_REPORTED', proficiencyScore: 0.70, confidence: 'LOW', createdAt: nowIso
      },
      {
        id: 'ev_02', userId: 'demo_user_01', skillId: 'skill_nodejs',
        sourceType: 'SELF_REPORTED', proficiencyScore: 0.50, confidence: 'LOW', createdAt: nowIso
      }
    ];
    for (const ev of initialEvidence) {
      await client.query(
        `INSERT INTO skill_evidence (id, user_id, skill_id, source_type, proficiency_score, confidence, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7::timestamptz)
         ON CONFLICT (id) DO NOTHING`,
        [ev.id, ev.userId, ev.skillId, ev.sourceType, ev.proficiencyScore, ev.confidence, ev.createdAt]
      );
    }

    // --- Recommendations: no static seeds. Recommendations are derived
    // dynamically from assessed skill gaps via RecommendationService, so we
    // purge any legacy hardcoded demo rows (and any transient test rows)
    // rather than re-inserting them on every boot.
    await client.query(
      `DELETE FROM recommendations WHERE user_id = $1`,
      ['demo_user_01']
    );

    // --- No demo portfolio project. The portfolio only shows real GitHub
    // submissions from the current user, so drop the legacy demo project.
    await client.query(
      `DELETE FROM projects WHERE id = 'proj_demo_01' OR user_id = 'demo_user_01'`
    );

    // Skill-evidence contributed by the demo project (source_type PROJECT) is
    // also stale now that the demo portfolio is gone.
    await client.query(
      `DELETE FROM skill_evidence WHERE user_id = 'demo_user_01' AND source_type = 'PROJECT'`
    );
  });

  console.log('[SkillBridge DB] Seed data applied.');
}

export async function initDb(): Promise<void> {
  await applySchema();
  await seedAll();
}

if (require.main === module) {
  initDb()
    .then(() => {
      console.log('[SkillBridge DB] Initialization complete.');
      process.exit(0);
    })
    .catch(err => {
      console.error('[SkillBridge DB] Initialization failed:', err);
      process.exit(1);
    });
}
