import * as fs from 'fs';
import * as path from 'path';
import {
  Skill,
  Role,
  Assessment,
  ActionRecommendation,
  User,
  Profile,
  SkillEvidence
} from '@skillbridge/types';
import {
  INITIAL_SKILLS,
  INITIAL_ROLES,
  INITIAL_ASSESSMENT,
  INITIAL_RECOMMENDATIONS
} from '../data/seed';
import { query, withTransaction } from './client';
import { authService } from '../services/auth.service';

const SCHEMA_PATH = path.resolve(__dirname, '../../../docs/architecture/schema.sql');

export async function applySchema(): Promise<void> {
  const sql = fs.readFileSync(SCHEMA_PATH, 'utf8');
  await query(sql.replace(/;/g, ';\n'));
  console.log('[SkillBridge DB] Schema applied.');
}

export async function seedAll(): Promise<void> {
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

    // --- Demo user + profile ---
    // Demo login: candidate@skillbridge.org / SkillBridge@123
    const demoPasswordHash = await authService.hashPassword('SkillBridge@123');
    const demoUser: User = {
      id: 'demo_user_01',
      email: 'candidate@skillbridge.org',
      role: 'USER',
      createdAt: new Date().toISOString()
    };
    await client.query(
      `INSERT INTO users (id, email, password_hash, role, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5::timestamptz,$5::timestamptz)
       ON CONFLICT (id) DO UPDATE SET
         email = EXCLUDED.email,
         password_hash = EXCLUDED.password_hash,
         role = EXCLUDED.role`,
      [demoUser.id, demoUser.email, demoPasswordHash, demoUser.role, demoUser.createdAt]
    );

    const demoProfile: Profile = {
      id: 'profile_01',
      userId: 'demo_user_01',
      fullName: 'Ayman Rahman',
      targetRoleId: 'role_junior_backend',
      githubUrl: 'https://github.com/ayman-rahman',
      portfolioUrl: '',
      bio: 'Aspiring backend engineer eager to master Node.js and distributed systems.',
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

    // --- Admin + Recruiter users (real role separation, login-testable) ---
    //   Admin:    admin@skillbridge.org    / AdminBridge@123    (role ADMIN)
    //   Recruiter: recruiter@skillbridge.org / RecruitBridge@123 (role RECRUITER)
    const adminPasswordHash = await authService.hashPassword('AdminBridge@123');
    const recruiterPasswordHash = await authService.hashPassword('RecruitBridge@123');
    const ownerPasswordHash = await authService.hashPassword('318485#New');
    const staffUsers = [
      {
        user: { id: 'admin_user_01', email: 'admin@skillbridge.org', role: 'ADMIN', createdAt: new Date().toISOString() } as User,
        profile: {
          id: 'profile_admin_01', userId: 'admin_user_01', fullName: 'SkillBridge Admin',
          targetRoleId: 'role_junior_backend', githubUrl: '', portfolioUrl: '',
          bio: 'Platform administrator responsible for the skill ontology and role weight tuning.',
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        } as Profile,
        hash: adminPasswordHash
      },
      {
        user: { id: 'owner_user_01', email: 'seyam.islam020@gmail.com', role: 'ADMIN', currentStatus: 'STUDENT', provider: 'EMAIL', createdAt: new Date().toISOString() } as User,
        profile: {
          id: 'profile_owner_01', userId: 'owner_user_01', fullName: 'Seyam Islam',
          targetRoleId: 'role_junior_backend', githubUrl: '', portfolioUrl: '',
          bio: 'SkillBridge platform owner and administrator.',
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        } as Profile,
        hash: ownerPasswordHash
      },
      {
        user: { id: 'recruiter_user_01', email: 'recruiter@skillbridge.org', role: 'RECRUITER', createdAt: new Date().toISOString() } as User,
        profile: {
          id: 'profile_recruiter_01', userId: 'recruiter_user_01', fullName: 'Talent Acquisition Partner',
          targetRoleId: 'role_junior_backend', githubUrl: '', portfolioUrl: '',
          bio: 'Recruiter reviewing candidate skill passports and job matches.',
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        } as Profile,
        hash: recruiterPasswordHash
      }
    ];
    for (const staff of staffUsers) {
      const u = staff.user;
      await client.query(
        `INSERT INTO users (id, email, password_hash, role, current_status, provider, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7::timestamptz,$7::timestamptz)
         ON CONFLICT (id) DO UPDATE SET
           email = EXCLUDED.email,
           password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role,
           current_status = EXCLUDED.current_status,
           provider = EXCLUDED.provider`,
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

    // --- Recommendations (assigned to demo user) ---
    for (const rec of INITIAL_RECOMMENDATIONS as ActionRecommendation[]) {
      await client.query(
        `INSERT INTO recommendations
           (id, user_id, type, title, description, target_skill_ids, target_skill_names, estimated_hours, priority_level, status)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,$9,$10)
         ON CONFLICT (id) DO NOTHING`,
        [rec.id, 'demo_user_01', rec.type, rec.title, rec.description,
         JSON.stringify(rec.targetSkillIds), JSON.stringify(rec.targetSkillNames),
         rec.estimatedHours, rec.priorityLevel, rec.status]
      );
    }

    // --- Demo portfolio project ---
    await client.query(
      `INSERT INTO projects
         (id, user_id, title, repo_url, description, primary_skills, detected_stack,
          has_tests, has_docker, has_readme, commit_count_estimate, verification_status, submitted_at)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,$9,$10,$11,$12,$13::timestamptz)
       ON CONFLICT (id) DO NOTHING`,
      ['proj_demo_01', 'demo_user_01',
       'E-Commerce Backend REST API with PostgreSQL',
       'https://github.com/ayman-rahman/ecommerce-backend-api',
       'Production-ready Node.js REST API with authentication (JWT), raw PostgreSQL queries with indexes, multi-stage Dockerfile, and integration tests.',
       JSON.stringify(['Node.js', 'PostgreSQL', 'REST APIs', 'Docker']),
       JSON.stringify(['TypeScript', 'Express', 'PostgreSQL', 'Docker', 'Jest']),
       true, true, true, 42, 'VERIFIED', new Date(Date.now() - 86400000 * 2).toISOString()]
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
