import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { store } from '../../store';
import { query } from '../../db/client';
import { AddJobSourceDto, UpdateJobSourceDto } from '../../dto/admin.dto';
import { AuthPayload } from '../../services/auth.service';

@Injectable()
export class AdminService {
  async getOverview() {
    const [skills, roles, assessments, jobs] = await Promise.all([
      store.getSkills(),
      store.getRoles(),
      store.getAssessments(),
      store.getJobs()
    ]);

    let totalAliases = 0;
    for (const s of skills) {
      totalAliases += s.aliases.length;
    }

    let totalQuestions = 0;
    for (const a of assessments) {
      totalQuestions += a.questions?.length || 0;
    }

    const attemptRows = await query<any>(`SELECT COUNT(*)::int AS count FROM assessment_attempts`);
    const totalAttempts = attemptRows[0]?.count || 0;

    return {
      canonicalSkillsCount: skills.length,
      totalAliasesCount: totalAliases,
      totalJobsCount: jobs.length,
      totalQuestionsCount: totalQuestions,
      totalAttemptsCount: totalAttempts
    };
  }

  async addSkillAlias(skillId: string, alias: string) {
    if (!skillId || !alias) {
      throw new BadRequestException('skillId and alias are required');
    }

    const skill = await store.getSkill(skillId);
    if (!skill) {
      throw new NotFoundException('Skill not found');
    }

    const cleanAlias = alias.trim().toLowerCase();
    if (!skill.aliases.includes(cleanAlias)) {
      await query(
        `INSERT INTO skill_aliases (skill_id, alias) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [skillId, cleanAlias]
      );
      skill.aliases.push(cleanAlias);
    }

    return { success: true, skill };
  }

  async updateRoleWeights(
    roleId: string,
    skillId: string,
    roleWeight?: number,
    marketDemandFrequency?: number
  ) {
    const role = await store.getRole(roleId);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const roleSkill = role.roleSkills.find(rs => rs.skillId === skillId);
    if (!roleSkill) {
      throw new NotFoundException('Skill not in role');
    }

    const updatedWeight = typeof roleWeight === 'number'
      ? Math.min(Math.max(roleWeight, 0), 1)
      : roleSkill.roleWeight;

    const updatedFreq = typeof marketDemandFrequency === 'number'
      ? Math.min(Math.max(marketDemandFrequency, 0), 1)
      : roleSkill.marketDemandFrequency;

    await store.updateRoleSkillWeights(role.id, skillId, {
      roleWeight: updatedWeight,
      marketDemandFrequency: updatedFreq
    });

    roleSkill.roleWeight = updatedWeight;
    roleSkill.marketDemandFrequency = updatedFreq;

    return { success: true, roleSkill };
  }

  async addQuestion(
    assessmentId: string = 'assessment_backend_diagnostic',
    prompt: string,
    correctAnswer: string,
    subSkill: string,
    codeSnippet?: string,
    questionType: string = 'MCQ',
    options?: string[],
    explanation?: string,
    points: number = 15
  ) {
    if (!prompt || !correctAnswer || !subSkill) {
      throw new BadRequestException('prompt, correctAnswer, and subSkill are required');
    }

    const assessment = await store.getAssessment(assessmentId);
    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    const newQuestion = {
      id: `q_${Date.now()}`,
      assessmentId,
      prompt,
      codeSnippet,
      questionType: questionType as any,
      options: options || ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer,
      explanation: explanation || 'Standard verified answer.',
      subSkill,
      difficulty: 'Intermediate' as const,
      points
    };

    await store.addQuestion(newQuestion);
    return { success: true, question: newQuestion };
  }

  // --- Source Management ---

  async getSources() {
    const sources = await store.getJobSources();
    const jobs = await store.getJobs();
    const jobCountBySource = new Map<string, number>();
    for (const j of jobs) {
      const src = j.sourceName;
      if (src) jobCountBySource.set(src, (jobCountBySource.get(src) || 0) + 1);
    }
    return sources.map(s => ({
      ...s,
      jobCount: jobCountBySource.get(s.name) || s.jobCount || 0
    }));
  }

  async addSource(body: AddJobSourceDto) {
    if (!body.name || !body.accessMethod) {
      throw new BadRequestException('name and accessMethod are required');
    }
    const result = await store.addJobSource({
      name: body.name,
      sourceType: body.sourceType || 'API',
      accessMethod: body.accessMethod,
      website: body.website,
      apiUrl: body.apiUrl,
      feedUrl: body.feedUrl,
      careerUrl: body.careerUrl,
      crawlAllowed: body.crawlAllowed ?? false,
      redistributionAllowed: body.redistributionAllowed ?? false,
      permissionStatus: body.permissionStatus || 'PENDING',
      permissionReference: body.permissionReference,
      licenseNotes: body.licenseNotes
    });
    return { success: true, source: result };
  }

  async updateSource(sourceId: string, body: UpdateJobSourceDto) {
    if (!sourceId) throw new BadRequestException('sourceId is required');
    await store.updateJobSource(sourceId, body);
    return { success: true };
  }

  async deleteSource(sourceId: string) {
    if (!sourceId) throw new BadRequestException('sourceId is required');
    const removed = await store.deleteJobsBySource(sourceId);
    await store.deleteJobSource(sourceId);
    return { success: true, jobsRemoved: removed };
  }

  // --- Job Removal ---

  async deleteJob(jobId: string) {
    if (!jobId) throw new BadRequestException('jobId is required');
    const deleted = await store.deleteJobById(jobId);
    if (!deleted) throw new NotFoundException('Job not found');
    return { success: true };
  }

  // --- Verification ---

  async runVerificationSweep() {
    const result = await store.runVerificationSweep();
    return { success: true, ...result };
  }

  async getVerificationStatus() {
    const rows = await query<any>(
      `SELECT verification_status AS status, COUNT(*)::int AS count
       FROM jobs
       GROUP BY verification_status
       ORDER BY count DESC`
    );
    const totalRows = await query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM jobs`
    );
    return {
      totalJobs: Number(totalRows[0]?.c || 0),
      byStatus: rows.map(r => ({
        status: r.status || 'UNVERIFIED',
        count: r.count
      }))
    };
  }

  // --- User Management ---

  async getUsers(options?: { page?: number; pageSize?: number; search?: string }) {
    return store.getAllUsers(options);
  }

  async getDashboard() {
    const totalRows = await query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM users`);
    const totalUsers = Number(totalRows[0]?.c || 0);

    const roleRows = await query<any>(
      `SELECT role, COUNT(*)::int AS count FROM users GROUP BY role ORDER BY count DESC`
    );

    const statusRows = await query<any>(
      `SELECT COALESCE(current_status, 'OTHER') AS status, COUNT(*)::int AS count
       FROM users GROUP BY current_status ORDER BY count DESC`
    );

    const providerRows = await query<any>(
      `SELECT COALESCE(provider, 'EMAIL') AS provider, COUNT(*)::int AS count
       FROM users GROUP BY provider ORDER BY count DESC`
    );

    const recentRows = await query<any>(
      `SELECT to_char(created_at, 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
       FROM users
       WHERE created_at >= CURRENT_DATE - INTERVAL '13 days'
       GROUP BY day ORDER BY day ASC`
    );

    return {
      totalUsers,
      byRole: roleRows.map(r => ({ role: r.role || 'USER', count: r.count })),
      byStatus: statusRows.map(r => ({ status: r.status, count: r.count })),
      byProvider: providerRows.map(r => ({ provider: r.provider, count: r.count })),
      recentSignups: recentRows.map(r => ({ day: r.day, count: r.count }))
    };
  }

  async updateUserRole(userId: string, role: string, currentUser: AuthPayload) {
    if (!userId) throw new BadRequestException('userId is required');

    const target = await store.getUserById(userId);
    if (!target) throw new NotFoundException('User not found');

    if (currentUser.userId === userId) {
      throw new ForbiddenException('You cannot change your own role. Ask another admin.');
    }

    const isLastAdminDowngrade =
      target.role === 'ADMIN' && role !== 'ADMIN' &&
      (await store.countAdmins()) <= 1;
    if (isLastAdminDowngrade) {
      throw new ForbiddenException('Cannot demote the last remaining admin.');
    }

    const updated = await store.updateUserRole(userId, role);
    return { success: updated, userId, role };
  }

  async deleteUser(userId: string, currentUser: AuthPayload) {
    if (!userId) throw new BadRequestException('userId is required');

    const target = await store.getUserById(userId);
    if (!target) throw new NotFoundException('User not found');

    if (currentUser.userId === userId) {
      throw new ForbiddenException('You cannot delete your own account.');
    }

    if (target.role === 'ADMIN' && (await store.countAdmins()) <= 1) {
      throw new ForbiddenException('Cannot delete the last remaining admin.');
    }

    const deleted = await store.deleteUserById(userId);
    return { success: deleted, userId };
  }
}
