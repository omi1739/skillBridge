import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { AssessmentAttempt, SkillEvidence, SubSkillResult, Question, AssessmentConfig } from '@skillbridge/types';
import { store } from '../../store';
import { gapService } from '../../services/gap.service';
import { getAllBankQuestions, drawDiagnosticQuestions } from '../../data/question-bank';
import { assessmentEngine } from '../../services/assessment/assessment-engine.service';

export interface QuestionResult {
  question: Question;
  userAnswer: string | null;
  correct: boolean;
  correctAnswer: string;
  explanation: string;
}

@Injectable()
export class AssessmentsService {
  async getAssessments() {
    return store.getAssessments();
  }

  // ---- Skill-centric assessment system ----
  async getSkillAssessmentSkills() {
    return assessmentEngine.availableSkills();
  }

  async createSkillAssessment(userId: string, cfg: AssessmentConfig) {
    return assessmentEngine.createAssessment(userId, cfg);
  }

  async getSkillAssessmentSession(userId: string, sessionId: string) {
    return assessmentEngine.getSession(userId, sessionId);
  }

  async submitSkillAnswer(userId: string, sessionId: string, questionId: string, answer: unknown) {
    return assessmentEngine.submitAnswer(userId, sessionId, questionId, answer);
  }

  async submitSkillAssessment(userId: string, sessionId: string) {
    return assessmentEngine.submitAssessment(userId, sessionId);
  }

  async getSkillAssessmentResult(userId: string, sessionId: string) {
    return assessmentEngine.getResult(userId, sessionId);
  }

  async getSkillAssessmentHistory(userId: string) {
    return assessmentEngine.getHistory(userId);
  }

  async getSkillProgress(userId: string, skillId: string) {
    return assessmentEngine.getProgress(userId, skillId);
  }

  // ---- Legacy diagnostic ----
  async getAssessmentById(id: string) {
    const assessment = await store.getAssessment(id);
    if (!assessment) {
      throw new NotFoundException(`Assessment ${id} not found`);
    }
    return assessment;
  }

  /**
   * Return a random, sub-skill-balanced diagnostic attempt. The bank replaces
   * the single static question set stored in the DB, so every retake gets a
   * fresh subset. Correct answers/explanations are NOT returned to the client.
   */
  getDiagnosticAssessment(count?: number) {
    const picked = drawDiagnosticQuestions({ count });
    return {
      id: 'assessment_backend_diagnostic',
      title: 'Backend Engineering Core Diagnostic',
      description:
        'A randomized, adaptive diagnostic across asynchronous JavaScript, Node.js, SQL, REST design, security, and containerization.',
      timeLimitMinutes: 15,
      passingScore: 70,
      version: '1.1.0',
      questionCount: picked.length,
      questions: picked.map(q => ({
        id: q.id,
        assessmentId: q.assessmentId,
        prompt: q.prompt,
        codeSnippet: q.codeSnippet,
        questionType: q.questionType,
        options: q.options,
        subSkill: q.subSkill,
        difficulty: q.difficulty,
        points: q.points
      }))
    };
  }

  async submitAssessment(
    assessmentId: string,
    userId: string = 'demo_user_01',
    answers: Array<{ questionId: string; selectedAnswer: string }>
  ) {
    const bank = getAllBankQuestions();
    const bankMap = new Map(bank.map(q => [q.id, q]));

    // Primary diagnostic is served from the question bank for randomized
    // retakes; the DB-stored assessment is kept as a legacy fallback for any
    // non-diagnostic assessment id.
    if (assessmentId === 'assessment_backend_diagnostic') {
      return this.grade(assessmentId, bankMap, answers, userId, 70, 'skill_javascript');
    }

    const dbAssessment = await store.getAssessment(assessmentId);
    if (!dbAssessment) {
      throw new NotFoundException(`Assessment ${assessmentId} not found`);
    }
    const qs = dbAssessment.questions || [];
    if (qs.length === 0) {
      throw new NotFoundException(`Assessment ${assessmentId} has no questions`);
    }
    const map = new Map(qs.map(q => [q.id, q]));
    return this.grade(assessmentId, map, answers, userId, dbAssessment.passingScore, dbAssessment.skillId);
  }

  private async grade(
    assessmentId: string,
    questionMap: Map<string, Question>,
    answers: Array<{ questionId: string; selectedAnswer: string }>,
    userId: string,
    passingScore: number,
    skillId?: string
  ) {
    if (!answers || !Array.isArray(answers)) {
      throw new BadRequestException('Answers array is required');
    }

    let totalPointsEarned = 0;
    let maxPoints = 0;

    const subSkillPoints: Record<string, { earned: number; total: number }> = {};
    const questionResults: QuestionResult[] = [];

    for (const [id, q] of questionMap.entries()) {
      const ans = answers.find(a => a.questionId === id);
      const selected = ans ? ans.selectedAnswer : null;
      const correct = selected != null && selected === q.correctAnswer;

      maxPoints += q.points;
      if (!subSkillPoints[q.subSkill]) {
        subSkillPoints[q.subSkill] = { earned: 0, total: 0 };
      }
      subSkillPoints[q.subSkill].total += q.points;

      if (correct) {
        totalPointsEarned += q.points;
        subSkillPoints[q.subSkill].earned += q.points;
      }

      questionResults.push({
        question: {
          id: q.id,
          assessmentId: q.assessmentId,
          prompt: q.prompt,
          codeSnippet: q.codeSnippet,
          questionType: q.questionType,
          options: q.options ? [...q.options] : undefined,
          subSkill: q.subSkill,
          difficulty: q.difficulty,
          points: q.points,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation
        },
        userAnswer: selected,
        correct,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation
      });
    }

    const scorePercentage = maxPoints > 0 ? Math.round((totalPointsEarned / maxPoints) * 100) : 0;
    const passed = scorePercentage >= passingScore;

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
      skillId: skillId || 'skill_javascript',
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
      detailedResults: questionResults
    };
  }
}
