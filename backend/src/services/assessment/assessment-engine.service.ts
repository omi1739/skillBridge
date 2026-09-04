import {
  AssessmentConfig,
  AssessmentResult,
  AssessmentSession,
  BankQuestion,
  QuestionResult,
  SkillLevel,
  SkillEvidence,
  TopicResult
} from '@skillbridge/types';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import {
  createAssessmentSession,
  getSessionByAttemptId,
  getSessionsForUser,
  getSessionQuestions,
  saveAssessmentQuestions,
  saveUserAnswer,
  getUserAnswers,
  saveTopicResults,
  completeSession,
  getAssessmentHistory,
  getSkillProgress,
  getSkills,
  getBankQuestionById,
  questionPoints,
  expireSession
} from '../../store/assessment.store';
import { store } from '../../store';
import { gapService } from '../gap.service';
import { questionSelectionService, SelectionContext } from './question-selection.service';
import { answerEvaluationService } from './answer-evaluation.service';
import { scoringService, skillLevelForScore } from './scoring.service';

/**
 * Orchestrates the full skill assessment lifecycle: create, select, answer,
 * evaluate, score, level, topic performance, and result. All user identity is
 * derived from the authenticated session, never from the client.
 */
export class AssessmentEngine {
  // In-progress sessions older than this (ms) are treated as expired and
  // cannot be resumed or submitted. Overridable via env, default 24h.
  private static readonly SESSION_TTL_MS = Number(process.env.ASSESSMENT_TTL_MS || 24 * 60 * 60 * 1000);

  private nextAttemptId(): string {
    return `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private async markExpiredIfStale(session: { id: string; status: string; started_at: string }): Promise<boolean> {
    if (session.status === 'in_progress' && session.started_at) {
      const age = Date.now() - new Date(session.started_at).getTime();
      if (age > AssessmentEngine.SESSION_TTL_MS) {
        await expireSession(session.id);
        return true;
      }
    }
    return false;
  }

  async availableSkills() {
    return getSkills();
  }

  /**
   * Create an assessment session: select a fixed set of questions (back-end,
   * randomized, difficulty-configurable, avoiding repeated questions where
   * possible) and persist both the session and its question selection so an
   * in-progress assessment survives a page refresh with the SAME questions.
   */
  async createAssessment(userId: string, cfg: AssessmentConfig): Promise<AssessmentSession> {
    const allocation = this.normalizeAllocation(cfg);
    const context: SelectionContext = {
      skillId: cfg.skillId,
      usedQuestionIds: await this.collectUsedQuestionIds(userId)
    };

    const questions = await questionSelectionService.selectQuestions(allocation, context);
    if (questions.length === 0) {
      throw new BadRequestException(
        `No approved questions available for skill ${cfg.skillId}.`
      );
    }

    const attemptId = this.nextAttemptId();
    await createAssessmentSession({
      id: attemptId,
      userId,
      skillId: cfg.skillId,
      difficulty: 'mixed',
      questionCount: questions.length
    });

    await saveAssessmentQuestions(
      attemptId,
      questions.map((q, i) => ({ questionId: q.id, position: i }))
    );

    const skill = (await getSkills()).find(s => s.id === cfg.skillId);

    return {
      id: attemptId,
      userId,
      skillId: cfg.skillId,
      skillName: skill?.canonicalName || cfg.skillId,
      difficulty: 'mixed',
      questionCount: questions.length,
      status: 'in_progress',
      startedAt: new Date().toISOString(),
      questions: questions.map((q, i) => this.toQuestionView(q, allocation, i))
    };
  }

  async getSession(userId: string, attemptId: string): Promise<AssessmentSession> {
    const session = await getSessionByAttemptId(attemptId);
    if (!session) throw new NotFoundException(`Assessment session ${attemptId} not found`);
    if (session.user_id !== userId) {
      throw new ForbiddenException('You do not have access to this assessment');
    }
    await this.markExpiredIfStale(session);
    const fresh = await getSessionByAttemptId(attemptId);
    const status = fresh?.status || session.status;
    const questions = await getSessionQuestions(attemptId);
    return {
      id: session.id,
      userId: session.user_id,
      skillId: session.skill_id,
      difficulty: session.difficulty || 'mixed',
      questionCount: Number(session.question_count || questions.length),
      status: (status as any) || 'in_progress',
      startedAt: session.started_at,
      completedAt: session.completed_at || undefined,
      score: session.score != null ? Number(session.score) : undefined,
      skillLevel: (session.skill_level as SkillLevel) || undefined,
      questions
    };
  }

  async submitAnswer(userId: string, attemptId: string, questionId: string, answer: unknown): Promise<{ correct: boolean }> {
    const session = await this.assertOwnerInProgress(userId, attemptId);
    const question = await getBankQuestionById(questionId);
    if (!question) throw new NotFoundException(`Question ${questionId} not found`);
    // Verify the question is part of this fixed assessment session.
    const sessionQuestions = await getSessionQuestions(attemptId);
    if (!sessionQuestions.some(q => q.id === questionId)) {
      throw new BadRequestException('Question is not part of this assessment');
    }
    const correct = answerEvaluationService.evaluate(question, answer);
    await saveUserAnswer({
      attemptId,
      questionId,
      answer,
      isCorrect: correct,
      timeTakenMs: undefined
    });
    return { correct };
  }

  async submitAssessment(userId: string, attemptId: string): Promise<AssessmentResult> {
    await this.assertOwnerInProgress(userId, attemptId);
    const questions = await getSessionQuestions(attemptId);
    if (questions.length === 0) {
      throw new BadRequestException('Assessment has no questions to grade');
    }

    const existingAnswers = await getUserAnswers(attemptId);
    const answerMap = new Map(existingAnswers.map(a => [a.questionId, a]));

    let earnedWeighted = 0;
    let maxWeighted = 0;
    let correctCount = 0;
    const byTopic: Record<string, { earned: number; total: number }> = {};
    const detailedResults: QuestionResult[] = [];

    for (const view of questions) {
      const q = await getBankQuestionById(view.id);
      if (!q) continue;
      const points = questionPoints(q.difficulty) as number;
      const weight = points;
      maxWeighted += weight;
      if (!byTopic[q.topic]) byTopic[q.topic] = { earned: 0, total: 0 };
      byTopic[q.topic].total += weight;

      const stored = answerMap.get(view.id);
      const submitted = stored ? stored.answer : null;
      const correct = stored ? stored.isCorrect : false;
      // Multiple-select can earn partial credit; other types are all-or-nothing.
      const credit = stored
        ? answerEvaluationService.partialCredit(q, stored.answer)
        : 0;
      if (correct) {
        correctCount++;
      }
      if (credit > 0) {
        earnedWeighted += weight * credit;
        byTopic[q.topic].earned += weight * credit;
      }

      detailedResults.push({
        question: {
          id: q.id,
          assessmentId: '',
          prompt: q.questionText,
          codeSnippet: q.codeSnippet,
          questionType: this.mapQuestionType(q.questionType),
          options: q.options ? [...q.options] : undefined,
          subSkill: q.topic,
          difficulty: q.difficulty === 'easy' ? 'Beginner' : q.difficulty === 'hard' ? 'Advanced' : 'Intermediate',
          points: weight,
          correctAnswer: Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : q.correctAnswer,
          explanation: q.explanation
        },
        userAnswer: Array.isArray(submitted) ? submitted.join(', ') : (submitted as any) || null,
        correct,
        correctAnswer: Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : q.correctAnswer,
        explanation: q.explanation
      });
    }

    const score = scoringService.calculateScore(earnedWeighted, maxWeighted);
    const skillLevel = skillLevelForScore(score);
    const topicResults = scoringService.topicResults(byTopic);
    const incorrectCount = questions.length - correctCount;

    await saveTopicResults(attemptId, topicResults);
    await completeSession({
      attemptId,
      score,
      skillLevel,
      topicResults,
      correctCount,
      incorrectCount
    });

    await this.recordEvidence(attemptId, userId, attemptId, skillLevel, score);

    const s = await getSessionByAttemptId(attemptId);
    const skills = await getSkills();
    const startedAt = s?.started_at || new Date().toISOString();
    const completedAt = s?.completed_at || new Date().toISOString();
    const skillId = s?.skill_id || '';

    return this.buildResult(
      attemptId,
      userId,
      score,
      skillLevel,
      topicResults,
      correctCount,
      incorrectCount,
      questions.length,
      startedAt,
      completedAt,
      undefined,
      detailedResults,
      skillId,
      skills.find(x => x.id === skillId)?.canonicalName || skillId
    );
  }

  async getResult(userId: string, attemptId: string): Promise<AssessmentResult> {
    const session = await getSessionByAttemptId(attemptId);
    if (!session) throw new NotFoundException(`Assessment ${attemptId} not found`);
    if (session.user_id !== userId) {
      throw new ForbiddenException('You do not have access to this assessment');
    }
    if (session.status !== 'completed' || session.score == null) {
      throw new BadRequestException('Assessment has not been completed yet');
    }
    const topicResults = (session.topic_results_json || []) as TopicResult[];
    const questions = await getSessionQuestions(attemptId);
    const answers = await getUserAnswers(attemptId);
    let correctCount = 0;
    const detailedResults: QuestionResult[] = [];
    for (const view of questions) {
      const q = await getBankQuestionById(view.id);
      const a = answers.find(x => x.questionId === view.id);
      const correct = a ? a.isCorrect : false;
      if (correct) correctCount++;
      if (q) {
        detailedResults.push({
          question: {
            id: q.id,
            assessmentId: '',
            prompt: q.questionText,
            codeSnippet: q.codeSnippet,
            questionType: this.mapQuestionType(q.questionType),
            options: q.options ? [...q.options] : undefined,
            subSkill: q.topic,
            difficulty: q.difficulty === 'easy' ? 'Beginner' : q.difficulty === 'hard' ? 'Advanced' : 'Intermediate',
            points: questionPoints(q.difficulty),
            correctAnswer: Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : q.correctAnswer,
            explanation: q.explanation
          },
          userAnswer: a ? (Array.isArray(a.answer) ? a.answer.join(', ') : (a.answer as any)) : null,
          correct,
          correctAnswer: Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : q.correctAnswer,
          explanation: q.explanation
        });
      }
    }
    const skills = await getSkills();
    const skillName = skills.find(s => s.id === session.skill_id)?.canonicalName || session.skill_id;
    const started = new Date(session.started_at).getTime();
    const completed = session.completed_at ? new Date(session.completed_at).getTime() : Date.now();

    return this.buildResult(
      attemptId,
      userId,
      Number(session.score),
      (session.skill_level as SkillLevel) || 'Beginner',
      topicResults,
      correctCount,
      questions.length - correctCount,
      questions.length,
      new Date(session.started_at).toISOString(),
      session.completed_at || new Date().toISOString(),
      Math.max(0, Math.round((completed - started) / 1000)),
      detailedResults,
      session.skill_id,
      skillName
    );
  }

  async getHistory(userId: string) {
    return getAssessmentHistory(userId);
  }

  async getProgress(userId: string, skillId: string) {
    const progress = await getSkillProgress(userId, skillId);
    if (!progress) throw new NotFoundException('No assessment history for this skill');
    return progress;
  }

  // ---- helpers ----

  private async assertOwnerInProgress(userId: string, attemptId: string) {
    const session = await getSessionByAttemptId(attemptId);
    if (!session) throw new NotFoundException(`Assessment session ${attemptId} not found`);
    if (session.user_id !== userId) {
      throw new ForbiddenException('You do not have access to this assessment');
    }
    if (await this.markExpiredIfStale(session)) {
      throw new BadRequestException('Assessment session has expired and can no longer be answered or submitted');
    }
    if (session.status === 'completed') {
      throw new BadRequestException('Assessment already completed');
    }
    if (session.status === 'expired' || session.status === 'abandoned') {
      throw new BadRequestException(`Assessment is ${session.status} and cannot be answered`);
    }
    return session;
  }

  private async collectUsedQuestionIds(userId: string): Promise<Set<string>> {
    const used = new Set<string>();
    const sessions = (await getSessionsForUser(userId)).filter(
      s => s.status === 'completed'
    );
    for (const s of sessions) {
      const qs = await getSessionQuestions(s.id);
      for (const q of qs) used.add(q.id);
    }
    return used;
  }

  private normalizeAllocation(cfg: AssessmentConfig): AssessmentConfig {
    const total = cfg.easyCount + cfg.mediumCount + cfg.hardCount;
    if (total <= 0) {
      throw new BadRequestException('Assessment must include at least one question');
    }
    return {
      ...cfg,
      totalQuestions: total,
      title: cfg.title
    };
  }

  private toQuestionView(q: BankQuestion, cfg: AssessmentConfig, index: number) {
    return {
      id: q.id,
      topic: q.topic || 'General',
      difficulty: q.difficulty,
      questionType: q.questionType,
      questionText: q.questionText,
      codeSnippet: q.codeSnippet,
      options: q.options || [],
      points: questionPoints(q.difficulty)
    };
  }

  private mapQuestionType(t: string): any {
    return t === 'code_output' ? 'OUTPUT_PREDICTION' : t === 'multiple_select' ? 'MCQ' : t as any;
  }

  private async recordEvidence(
    attemptId: string,
    userId: string,
    sourceId: string,
    skillLevel: SkillLevel,
    score: number
  ) {
    const session = await getSessionByAttemptId(attemptId);
    if (!session?.skill_id) return;
    const proficiencyRatio = score / 100;
    const evidence: SkillEvidence = {
      id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      userId,
      skillId: session.skill_id,
      sourceType: 'ASSESSMENT',
      sourceId,
      proficiencyScore: proficiencyRatio,
      confidence: score >= 70 ? 'HIGH' : 'MEDIUM',
      metadata: { skillLevel, score, assessmentType: 'skill_assessment' },
      createdAt: new Date().toISOString()
    };
    await store.saveEvidence(userId, [evidence]);
    await gapService.calculateGaps(userId, 'role_junior_backend').catch(() => undefined);
  }

  private buildResult(
    attemptId: string,
    userId: string,
    score: number,
    skillLevel: SkillLevel,
    topicResults: TopicResult[],
    correctCount: number,
    incorrectCount: number,
    totalQuestions: number,
    startedAt?: string,
    completedAt?: string,
    durationSeconds?: number,
    detailedResults?: QuestionResult[],
    skillId?: string,
    skillName?: string
  ): AssessmentResult {
    return {
      assessmentId: attemptId,
      sessionId: attemptId,
      skillId: skillId || '',
      skillName: skillName || '',
      score,
      skillLevel,
      topicResults,
      strengths: scoringService.strengths(topicResults),
      needsImprovement: scoringService.needsImprovement(topicResults),
      correctCount,
      incorrectCount,
      totalQuestions,
      startedAt: startedAt || new Date().toISOString(),
      completedAt: completedAt || new Date().toISOString(),
      durationSeconds,
      detailedResults
    };
  }
}

export const assessmentEngine = new AssessmentEngine();
