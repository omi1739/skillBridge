import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { store } from '../../store';
import { query } from '../../db/client';

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
}
