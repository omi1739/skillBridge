import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { AssessmentAttempt, SkillEvidence, SubSkillResult, Question, AssessmentConfig } from '@skillbridge/types';
import { store } from '../../store';
import { query } from '../../db/client';
import { gapService } from '../../services/gap.service';
import { getAllBankQuestions, drawDiagnosticQuestions, getDiagnosticQuestionsByIds } from '../../data/question-bank';
import { assessmentEngine } from '../../services/assessment/assessment-engine.service';

export interface QuestionResult {
  question: Question;
  userAnswer: string | null;
  correct: boolean;
  /** Only populated for questions the user actually answered. */
  correctAnswer?: string;
  /** Only populated for questions the user actually answered. */
  explanation?: string;
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
    answers: Array<{ questionId: string; selectedAnswer: string }>,
    attemptId?: string
  ) {
    const bank = getAllBankQuestions();
    const bankMap = new Map(bank.map(q => [q.id, q]));

    // Primary diagnostic is served from the question bank for randomized
    // retakes; the DB-stored assessment is kept as a legacy fallback for any
    // non-diagnostic assessment id.
    if (assessmentId === 'assessment_backend_diagnostic') {
      const timed = await this.assertLegacyStarted(userId, assessmentId, 15, attemptId);
      // Grade ONLY the subset this attempt actually served. Falling back to the
      // full bank would make every run unwinnable (the denominator would
      // include up to 16 questions while the client was given 8–12).
      const servedMap = this.buildServedMap(bankMap, timed.questionIds);
      return this.grade(assessmentId, servedMap, answers, userId, 70, 'skill_javascript', timed);
    }

    const dbAssessment = await store.getAssessment(assessmentId, true);
    if (!dbAssessment) {
      throw new NotFoundException(`Assessment ${assessmentId} not found`);
    }
    const qs = dbAssessment.questions || [];
    if (qs.length === 0) {
      throw new NotFoundException(`Assessment ${assessmentId} has no questions`);
    }
    const map = new Map(qs.map(q => [q.id, q]));
    const timeLimitMinutes = dbAssessment.timeLimitMinutes ?? 15;
    const timed = await this.assertLegacyStarted(userId, assessmentId, timeLimitMinutes, attemptId);
    return this.grade(assessmentId, map, answers, userId, dbAssessment.passingScore, dbAssessment.skillId, timed);
  }

  /**
   * Restrict the grading map to the question ids recorded on the attempt. When
   * no subset was recorded (legacy attempts created before the subset was
   * persisted), fall back to the full bank so behaviour stays deterministic.
   */
  private buildServedMap(bankMap: Map<string, Question>, recordedIds: string[]): Map<string, Question> {
    if (!recordedIds || recordedIds.length === 0) return bankMap;
    const served = new Map<string, Question>();
    for (const id of recordedIds) {
      const q = bankMap.get(id);
      if (q) served.set(id, q);
    }
    return served.size > 0 ? served : bankMap;
  }

  /**
   * Server-side start record for the legacy diagnostic flow. The client timer
   * is cosmetic; this row supplies the trusted clock used at submit time so a
   * stalled or forged client cannot bypass the time limit.
   *
   * Re-starting while an attempt is still within its window reuses the same
   * attempt (same `started_at`), so re-calling this endpoint cannot reset the
   * clock. The served question subset is recorded on the attempt so grading
   * only ever runs against the questions the client was given.
   */
  async startAssessment(
    assessmentId: string,
    userId: string,
    count?: number
  ): Promise<{
    attemptId: string;
    startedAt: string;
    timeLimitMinutes: number;
    questions?: Question[];
  }> {
    const isDiagnostic = assessmentId === 'assessment_backend_diagnostic';
    const timeLimitMinutes = isDiagnostic
      ? 15
      : (await store.getAssessment(assessmentId))?.timeLimitMinutes ?? 15;

    // Reuse any IN_PROGRESS attempt that is still inside its time window. This
    // both keeps the guaranteed subset stable across re-renders and denies the
    // "re-call /start to reset the clock" bypass.
    const existing = await query<{ id: string; started_at: string; question_ids_json: unknown }>(
      `SELECT id, started_at, question_ids_json FROM assessment_attempts
       WHERE user_id = $1 AND assessment_id = $2 AND status = 'IN_PROGRESS'
       ORDER BY started_at DESC LIMIT 1`,
      [userId, assessmentId]
    );
    const active = existing[0];
    if (active && Date.now() - new Date(active.started_at).getTime() <= timeLimitMinutes * 60_000) {
      const recordedIds = Array.isArray(active.question_ids_json) ? active.question_ids_json.map(String) : [];
      return {
        attemptId: active.id,
        startedAt: new Date(active.started_at).toISOString(),
        timeLimitMinutes,
        questions: isDiagnostic && recordedIds.length > 0
          ? getDiagnosticQuestionsByIds(recordedIds)
          : undefined
      };
    }

    // A stale IN_PROGRESS row (window expired) may exist from an interrupted
    // previous run — close it out before starting fresh.
    if (active) {
      await query(`UPDATE assessment_attempts SET status = 'ABANDONED' WHERE id = $1`, [active.id]);
    }

    let questionIds: string[] = [];
    if (isDiagnostic) {
      const picked = drawDiagnosticQuestions({ count });
      questionIds = picked.map(q => q.id);
    }

    const attemptId = `att_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    await query(
      `INSERT INTO assessment_attempts (id, user_id, assessment_id, status, question_count, started_at, score, question_ids_json)
       VALUES ($1,$2,$3,'IN_PROGRESS',$4, now(), 0, $5::jsonb)`,
      [attemptId, userId, assessmentId, questionIds.length, JSON.stringify(questionIds)]
    );
    const row = await query<{ started_at: string }>(`SELECT started_at FROM assessment_attempts WHERE id = $1`, [attemptId]);
    return {
      attemptId,
      startedAt: row[0]?.started_at ? new Date(row[0].started_at).toISOString() : new Date().toISOString(),
      timeLimitMinutes,
      questions: isDiagnostic ? getDiagnosticQuestionsByIds(questionIds) : undefined
    };
  }

  /**
   * Enforces the server-side time window for a legacy attempt. The user must
   * have started the assessment and the elapsed time must not exceed the
   * configured limit, otherwise the attempt is abandoned and rejected.
   *
   * When `attemptId` is supplied, that exact attempt is validated (the attempt
   * the client actually started) rather than blindly picking the newest row —
   * this is what prevents a re-started timer from laundering a stale attempt.
   */
  private async assertLegacyStarted(
    userId: string,
    assessmentId: string,
    timeLimitMinutes: number,
    attemptId?: string
  ): Promise<{ attemptId: string; startedAt: string; questionIds: string[] }> {
    let rows: Array<{ id: string; started_at: string; status: string; question_ids_json: unknown }>;
    if (attemptId) {
      rows = await query(
        `SELECT id, started_at, status, question_ids_json FROM assessment_attempts
         WHERE id = $1 AND user_id = $2`,
        [attemptId, userId]
      );
      if (rows.length === 0) {
        throw new BadRequestException('This assessment attempt does not belong to the current user.');
      }
    } else {
      rows = await query(
        `SELECT id, started_at, status, question_ids_json FROM assessment_attempts
         WHERE user_id = $1 AND assessment_id = $2
         ORDER BY started_at DESC LIMIT 1`,
        [userId, assessmentId]
      );
    }
    const attempt = rows[0];
    if (!attempt) {
      throw new BadRequestException('This assessment was not started yet. Begin the assessment before submitting answers.');
    }
    if (attempt.status === 'COMPLETED') {
      // A completed attempt must not be re-graded: a duplicate POST would let a
      // client farm the correct answers one submission at a time. Start a fresh attempt to retake.
      throw new BadRequestException('This attempt has already been submitted. Start a new attempt to retake the assessment.');
    }
    if (attempt.status !== 'IN_PROGRESS') {
      throw new BadRequestException('This assessment attempt is no longer active.');
    }

    const elapsedMs = Date.now() - new Date(attempt.started_at).getTime();
    const limitMs = timeLimitMinutes * 60_000;
    if (elapsedMs > limitMs) {
      await query(`UPDATE assessment_attempts SET status = 'ABANDONED' WHERE id = $1`, [attempt.id]);
      throw new BadRequestException('The time limit for this assessment has expired. Start a new attempt to retake it.');
    }
    const questionIds = Array.isArray(attempt.question_ids_json)
      ? attempt.question_ids_json.map(String)
      : [];
    return { attemptId: attempt.id, startedAt: attempt.started_at, questionIds };
  }

  private async grade(
    assessmentId: string,
    questionMap: Map<string, Question>,
    answers: Array<{ questionId: string; selectedAnswer: string }>,
    userId: string,
    passingScore: number,
    skillId?: string,
    timed?: { attemptId: string; startedAt: string }
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

      // A candidate answers a fixed subset; never reveal correct answers /
      // explanations for questions they did not attempt (prevents answer farming).
      const attempted = ans !== undefined && selected != null;
      const review: QuestionResult = {
        question: {
          id: q.id,
          assessmentId: q.assessmentId,
          prompt: q.prompt,
          codeSnippet: q.codeSnippet,
          questionType: q.questionType,
          options: q.options ? [...q.options] : undefined,
          subSkill: q.subSkill,
          difficulty: q.difficulty,
          points: q.points
        },
        userAnswer: selected,
        correct
      };
      if (attempted) {
        review.correctAnswer = q.correctAnswer;
        review.explanation = q.explanation;
      }
      questionResults.push(review);
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
      id: timed?.attemptId || `att_${Date.now()}`,
      userId,
      assessmentId,
      startedAt: timed?.startedAt || new Date().toISOString(),
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
    const roleId = await store.getTargetRoleId(userId);
    const updatedGaps = await gapService.calculateGaps(userId, roleId);

    return {
      attempt,
      gaps: updatedGaps,
      detailedResults: questionResults
    };
  }
}
