import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { AssessmentAttempt, SkillEvidence, SubSkillResult } from '@skillbridge/types';
import { store } from '../../store';
import { gapService } from '../../services/gap.service';

@Injectable()
export class AssessmentsService {
  async getAssessments() {
    return store.getAssessments();
  }

  async getAssessmentById(id: string) {
    const assessment = await store.getAssessment(id);
    if (!assessment) {
      throw new NotFoundException(`Assessment ${id} not found`);
    }
    return assessment;
  }

  async submitAssessment(
    assessmentId: string,
    userId: string = 'demo_user_01',
    answers: Array<{ questionId: string; selectedAnswer: string }>
  ) {
    const assessment = await store.getAssessment(assessmentId);
    if (!assessment) {
      throw new NotFoundException(`Assessment ${assessmentId} not found`);
    }

    if (!answers || !Array.isArray(answers)) {
      throw new BadRequestException('Answers array is required');
    }

    const questionMap = new Map(assessment.questions?.map(q => [q.id, q]));
    let totalPointsEarned = 0;
    let maxPoints = 0;

    const subSkillPoints: Record<string, { earned: number; total: number }> = {};

    for (const ans of answers) {
      const q = questionMap.get(ans.questionId);
      if (!q) continue;

      maxPoints += q.points;
      if (!subSkillPoints[q.subSkill]) {
        subSkillPoints[q.subSkill] = { earned: 0, total: 0 };
      }
      subSkillPoints[q.subSkill].total += q.points;

      if (ans.selectedAnswer === q.correctAnswer) {
        totalPointsEarned += q.points;
        subSkillPoints[q.subSkill].earned += q.points;
      }
    }

    const scorePercentage = maxPoints > 0 ? Math.round((totalPointsEarned / maxPoints) * 100) : 0;
    const passed = scorePercentage >= assessment.passingScore;

    const subSkillScores: SubSkillResult[] = Object.entries(subSkillPoints).map(([subSkill, data]) => {
      const pct = data.total > 0 ? Math.round((data.earned / data.total) * 100) : 0;
      const status: 'STRENGTH' | 'MODERATE' | 'NEEDS_WORK' =
        pct >= 80 ? 'STRENGTH' : pct >= 50 ? 'MODERATE' : 'NEEDS_WORK';
      return {
        subSkill,
        earnedPoints: data.earned,
        totalPoints: data.total,
        percentage: pct,
        status
      };
    });

    const attempt: AssessmentAttempt = {
      id: `att_${Date.now()}`,
      userId,
      assessmentId,
      startedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      completedAt: new Date().toISOString(),
      score: scorePercentage,
      totalPointsEarned,
      maxPoints,
      passed,
      subSkillScores,
      status: 'COMPLETED'
    };

    await store.saveAttempt(attempt);

    // Elevate demonstrated proficiency evidence
    const proficiencyRatio = scorePercentage / 100;
    const evidenceConfidence = scorePercentage >= 70 ? 'HIGH' : 'MEDIUM';

    const newEvidence: SkillEvidence = {
      id: `ev_${Date.now()}`,
      userId,
      skillId: assessment.skillId || 'skill_javascript',
      sourceType: 'ASSESSMENT',
      sourceId: attempt.id,
      proficiencyScore: proficiencyRatio,
      confidence: evidenceConfidence,
      metadata: { attemptId: attempt.id, subSkillScores },
      createdAt: new Date().toISOString()
    };

    await store.saveEvidence(userId, [newEvidence]);
    const updatedGaps = await gapService.calculateGaps(userId, 'role_junior_backend');

    return {
      attempt,
      gaps: updatedGaps,
      detailedQuestions: assessment.questions
    };
  }
}
