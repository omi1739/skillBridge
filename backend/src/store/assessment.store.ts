import {
  AssessmentHistoryItem,
  AssessmentQuestionView,
  BankQuestion,
  QuestionGenerationResult,
  QuestionGenerationRequest,
  Skill,
  SkillLevel,
  SkillProgress,
  SkillTopic,
  TopicResult
} from '@skillbridge/types';
import { query, withTransaction } from '../db/client';

interface BankQuestionRow {
  id: string;
  prompt: string | null;
  skill_id: string;
  topic: string;
  difficulty: string;
  question_type: string;
  question_text: string;
  code_snippet: string | null;
  options_json: string[] | null;
  correct_answer: string | string[] | null;
  explanation: string;
  verification_status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface AttemptRow {
  id: string;
  user_id: string;
  skill_id: string;
  difficulty: string;
  status: string;
  score: number | null;
  skill_level: string | null;
  started_at: string;
  completed_at: string | null;
  question_count: number;
  topic_results_json: any;
  sub_skill_scores_json: any;
}

function parseCorrectAnswer(value: string | string[] | null): string | string[] {
  if (value == null) return '';
  if (Array.isArray(value)) return value;
  const trimmed = value.trim();
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      // fall through to scalar
    }
  }
  return value;
}

function mapBankQuestion(r: BankQuestionRow): BankQuestion {
  return {
    id: r.id,
    skillId: r.skill_id,
    topic: r.topic,
    difficulty: r.difficulty as BankQuestion['difficulty'],
    questionType: r.question_type as BankQuestion['questionType'],
    questionText: r.question_text || r.prompt || '',
    codeSnippet: r.code_snippet || undefined,
    options: r.options_json || [],
    correctAnswer: parseCorrectAnswer(r.correct_answer),
    explanation: r.explanation,
    verificationStatus: r.verification_status as BankQuestion['verificationStatus'],
    createdBy: r.created_by || undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}

// ---- Skill topics ----
export async function getSkillTopics(skillId: string): Promise<SkillTopic[]> {
  const rows = await query<any>(`SELECT * FROM skill_topics WHERE skill_id = $1 ORDER BY name`, [
    skillId
  ]);
  return rows.map(r => ({
    id: r.id,
    skillId: r.skill_id,
    name: r.name,
    description: r.description || undefined
  }));
}

export async function addSkillTopic(skillId: string, name: string, description?: string): Promise<void> {
  await query(
    `INSERT INTO skill_topics (id, skill_id, name, description) VALUES ($1,$2,$3,$4)
     ON CONFLICT (skill_id, name) DO NOTHING`,
    [`topic_${skillId}_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`, skillId, name, description || null]
  );
}

// ---- Bank questions ----
export async function getBankQuestionById(id: string): Promise<BankQuestion | undefined> {
  const rows = await query<BankQuestionRow>(`SELECT * FROM questions WHERE id = $1`, [id]);
  return rows.length ? mapBankQuestion(rows[0]) : undefined;
}

export async function getBankQuestions(opts?: {
  skillId?: string;
  status?: string;
}): Promise<BankQuestion[]> {
  const params: any[] = [];
  let where = '1=1';
  if (opts?.skillId) {
    params.push(opts.skillId);
    where += ` AND skill_id = $${params.length}`;
  }
  if (opts?.status) {
    params.push(opts.status);
    where += ` AND verification_status = $${params.length}`;
  }
  const rows = await query<BankQuestionRow>(
    `SELECT * FROM questions WHERE ${where} ORDER BY id`,
    params
  );
  return rows
    .filter(r => r.question_text || r.prompt)
    .map(mapBankQuestion);
}

export async function upsertBankQuestion(q: BankQuestion): Promise<void> {
  await query(
    `INSERT INTO questions
       (id, assessment_id, prompt, code_snippet, question_type, options_json, correct_answer,
        explanation, sub_skill, difficulty, points, skill_id, topic, verification_status,
        question_text, is_multiple_select, created_by, updated_at)
     VALUES ($1, NULL, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, now())
     ON CONFLICT (id) DO UPDATE SET
       prompt = EXCLUDED.prompt,
       question_text = EXCLUDED.question_text,
       code_snippet = EXCLUDED.code_snippet,
       question_type = EXCLUDED.question_type,
       options_json = EXCLUDED.options_json,
       correct_answer = EXCLUDED.correct_answer,
       explanation = EXCLUDED.explanation,
       sub_skill = EXCLUDED.topic,
       difficulty = EXCLUDED.difficulty,
       skill_id = EXCLUDED.skill_id,
       topic = EXCLUDED.topic,
       updated_at = now()`,
    [
      q.id,
      q.questionText,
      q.codeSnippet || null,
      q.questionType,
      JSON.stringify(q.options),
      Array.isArray(q.correctAnswer) ? JSON.stringify(q.correctAnswer) : q.correctAnswer,
      q.explanation,
      q.topic,
      q.difficulty,
      q.difficulty === 'easy' ? 1 : q.difficulty === 'hard' ? 3 : 2,
      q.skillId,
      q.topic,
      q.verificationStatus,
      q.questionText,
      q.questionType === 'multiple_select',
      q.createdBy || 'seed'
    ]
  );
}

export async function setQuestionVerificationStatus(
  questionId: string,
  status: string
): Promise<void> {
  await query(
    `UPDATE questions SET verification_status = $2, updated_at = now() WHERE id = $1`,
    [questionId, status]
  );
}

export async function listAdminBankQuestions(status?: string): Promise<BankQuestion[]> {
  const params: any[] = [];
  let where = 'q.assessment_id IS NULL';
  if (status) {
    params.push(status);
    where += ` AND q.verification_status = $${params.length}`;
  }
  const rows = await query<any>(
    `SELECT q.*, s.canonical_name AS skill_name
     FROM questions q
     LEFT JOIN skills s ON s.id = q.skill_id
     WHERE ${where} ORDER BY q.updated_at DESC`,
    params
  );
  return rows
    .filter(r => r.question_text || r.prompt)
    .map(r => ({
      ...mapBankQuestion(r),
      skillName: r.skill_name || r.skill_id
    }));
}

const POINTS: Record<string, number> = { easy: 1, medium: 2, hard: 3 };

// ---- Assessment sessions (assessment_attempts) ----
export async function createAssessmentSession(input: {
  id: string;
  userId: string;
  skillId: string;
  difficulty: string;
  questionCount: number;
}): Promise<void> {
  await query(
    `INSERT INTO assessment_attempts
       (id, user_id, skill_id, difficulty, status, question_count, started_at)
     VALUES ($1,$2,$3,$4,'in_progress',$5, now())`,
    [input.id, input.userId, input.skillId, input.difficulty, input.questionCount]
  );
}

export async function getAssessmentSession(id: string): Promise<any | undefined> {
  const rows = await query<AttemptRow>(
    `SELECT * FROM assessment_attempts WHERE id = $1`,
    [id]
  );
  if (rows.length === 0) return undefined;
  return rows[0];
}

export async function getSessionByAttemptId(id: string): Promise<AttemptRow | undefined> {
  const rows = await query<AttemptRow>(`SELECT * FROM assessment_attempts WHERE id = $1`, [id]);
  return rows.length ? rows[0] : undefined;
}

export async function getSessionsForUser(userId: string): Promise<AttemptRow[]> {
  return query<AttemptRow>(
    `SELECT * FROM assessment_attempts WHERE user_id = $1 ORDER BY started_at DESC`,
    [userId]
  );
}

async function attachQuestions(attemptId: string): Promise<AssessmentQuestionView[]> {
  const rows = await query<any>(
    `SELECT q.id, q.topic, q.difficulty, q.question_type, q.question_text, q.code_snippet,
            q.options_json, q.points
     FROM assessment_questions aq
     JOIN questions q ON q.id = aq.question_id
     WHERE aq.attempt_id = $1
     ORDER BY aq.position`,
    [attemptId]
  );
  return rows.map(r => ({
    id: r.id,
    topic: r.topic,
    difficulty: r.difficulty,
    questionType: r.question_type,
    questionText: r.question_text || r.prompt,
    codeSnippet: r.code_snippet || undefined,
    options: r.options_json || [],
    points: Number(r.points)
  }));
}

export async function getSessionQuestions(attemptId: string): Promise<AssessmentQuestionView[]> {
  return attachQuestions(attemptId);
}

export async function saveAssessmentQuestions(
  attemptId: string,
  selections: Array<{ questionId: string; position: number }>
): Promise<void> {
  await withTransaction(async client => {
    for (const s of selections) {
      await client.query(
        `INSERT INTO assessment_questions (attempt_id, question_id, position)
         VALUES ($1,$2,$3) ON CONFLICT (attempt_id, question_id) DO NOTHING`,
        [attemptId, s.questionId, s.position]
      );
    }
  });
}

// ---- User answers ----
export async function saveUserAnswer(input: {
  attemptId: string;
  questionId: string;
  answer: any;
  isCorrect: boolean;
  timeTakenMs?: number;
}): Promise<void> {
  await query(
    `INSERT INTO user_answers (attempt_id, question_id, user_answer, is_correct, time_taken_ms, answered_at)
     VALUES ($1,$2,$3::jsonb,$4,$5, now())
     ON CONFLICT (attempt_id, question_id) DO UPDATE SET
       user_answer = EXCLUDED.user_answer, is_correct = EXCLUDED.is_correct, answered_at = now()`,
    [
      input.attemptId,
      input.questionId,
      JSON.stringify(input.answer),
      input.isCorrect,
      input.timeTakenMs || null
    ]
  );
}

export async function getUserAnswers(attemptId: string): Promise<
  Array<{ questionId: string; answer: any; isCorrect: boolean; timeTakenMs: number | null }>
> {
  const rows = await query<any>(
    `SELECT question_id, user_answer, is_correct, time_taken_ms FROM user_answers WHERE attempt_id = $1`,
    [attemptId]
  );
  return rows.map(r => ({
    questionId: r.question_id,
    answer: r.user_answer,
    isCorrect: r.is_correct,
    timeTakenMs: r.time_taken_ms
  }));
}

// ---- Topic results ----
export async function saveTopicResults(
  attemptId: string,
  results: TopicResult[]
): Promise<void> {
  await withTransaction(async client => {
    for (const r of results) {
      await client.query(
        `INSERT INTO assessment_topic_results (attempt_id, topic, earned_points, total_points, percentage)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (attempt_id, topic) DO UPDATE SET
           earned_points = EXCLUDED.earned_points,
           total_points = EXCLUDED.total_points,
           percentage = EXCLUDED.percentage`,
        [attemptId, r.topic, r.earnedPoints, r.totalPoints, r.percentage]
      );
    }
  });
}

export async function completeSession(input: {
  attemptId: string;
  score: number;
  skillLevel: SkillLevel;
  topicResults: TopicResult[];
  correctCount: number;
  incorrectCount: number;
}): Promise<void> {
  await query(
    `UPDATE assessment_attempts
     SET status = 'completed', score = $2, skill_level = $3,
         topic_results_json = $4::jsonb, completed_at = now(),
         total_points_earned = $5, max_points = $6
     WHERE id = $1`,
    [
      input.attemptId,
      input.score,
      input.skillLevel,
      JSON.stringify(input.topicResults),
      input.correctCount,
      input.incorrectCount
    ]
  );
}

export async function abandonSession(attemptId: string): Promise<void> {
  await query(`UPDATE assessment_attempts SET status = 'abandoned', completed_at = now() WHERE id = $1`, [
    attemptId
  ]);
}

export async function expireSession(attemptId: string): Promise<void> {
  await query(`UPDATE assessment_attempts SET status = 'expired', completed_at = now() WHERE id = $1`, [
    attemptId
  ]);
}

// ---- History / progress ----
export async function getAssessmentHistory(userId: string): Promise<AssessmentHistoryItem[]> {
  const rows = await query<any>(
    `SELECT a.id, a.skill_id, a.difficulty, a.score, a.skill_level, a.question_count,
            a.completed_at, a.status, s.canonical_name AS skill_name
     FROM assessment_attempts a
     LEFT JOIN skills s ON s.id = a.skill_id
     WHERE a.user_id = $1 AND a.status = 'completed' AND a.skill_id IS NOT NULL
     ORDER BY a.completed_at DESC`,
    [userId]
  );
  return rows.map(r => ({
    id: r.id,
    skillId: r.skill_id,
    skillName: r.skill_name || r.skill_id,
    difficulty: r.difficulty || 'medium',
    score: Number(r.score || 0),
    skillLevel: (r.skill_level as SkillLevel) || 'Beginner',
    questionCount: Number(r.question_count || 0),
    completedAt: r.completed_at,
    status: r.status
  }));
}

export async function getSkillProgress(
  userId: string,
  skillId: string
): Promise<SkillProgress | undefined> {
  const rows = await query<any>(
    `SELECT id, score, skill_level, completed_at
     FROM assessment_attempts
     WHERE user_id = $1 AND skill_id = $2 AND status = 'completed'
     ORDER BY completed_at DESC`,
    [userId, skillId]
  );
  if (rows.length === 0) return undefined;
  const skill = await query<any>(`SELECT canonical_name FROM skills WHERE id = $1`, [skillId]);
  const scores = rows.map(r => Number(r.score || 0));
  const trend = rows
    .map(r => ({ completedAt: r.completed_at, score: Number(r.score || 0) }))
    .reverse();
  return {
    skillId,
    skillName: skill[0]?.canonical_name || skillId,
    attemptCount: rows.length,
    averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    bestScore: Math.max(...scores),
    latestScore: scores[0],
    latestSkillLevel: (rows[0].skill_level as SkillLevel) || 'Beginner',
    trend
  };
}

export async function getSkills(): Promise<Skill[]> {
  const rows = await query<any>(`SELECT * FROM skills ORDER BY id`);
  return rows.map(r => ({
    id: r.id,
    canonicalName: r.canonical_name,
    category: r.category,
    description: r.description,
    aliases: [],
    prerequisites: r.prerequisites || []
  }));
}

// ---- Generation jobs ----
export async function createGenerationJob(input: {
  skillId: string;
  topic: string;
  difficulty: string;
  questionType: string;
  count: number;
}): Promise<string> {
  const rows = await query<{ id: string }>(
    `INSERT INTO question_generation_jobs
       (skill_id, topic, difficulty, question_type, requested_count, status)
     VALUES ($1,$2,$3,$4,$5,'pending')
     RETURNING id`,
    [input.skillId, input.topic, input.difficulty, input.questionType, input.count]
  );
  return rows[0].id;
}

export async function completeGenerationJob(
  jobId: string,
  status: string,
  result: QuestionGenerationResult
): Promise<void> {
  await query(
    `UPDATE question_generation_jobs SET status = $2, payload = $3::jsonb, completed_at = now() WHERE id = $1`,
    [jobId, status, JSON.stringify(result)]
  );
}

export function questionPoints(difficulty: string): number {
  return POINTS[difficulty] ?? 2;
}
