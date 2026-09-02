import express, { Request, Response } from 'express';
import cors from 'cors';
import {
  AssessmentAttempt,
  AssessmentSubmissionAnswer,
  SkillEvidence,
  SubSkillResult
} from '@skillbridge/types';
import { store } from './store';
import { gapService } from './services/gap.service';
import { matchService } from './services/match.service';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// 1. Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'skillbridge-api',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// 2. Auth & Current Profile
app.get('/api/me', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'demo_user_01';
  const user = store.users.get(userId);
  const profile = store.profiles.get(userId);

  if (!user || !profile) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ user, profile });
});

app.patch('/api/me/profile', (req: Request, res: Response) => {
  const userId = (req.body.userId as string) || 'demo_user_01';
  const profile = store.profiles.get(userId);

  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  const updatedProfile = {
    ...profile,
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  store.profiles.set(userId, updatedProfile);
  res.json(updatedProfile);
});

// 3. Declare Self-Reported Skill
app.post('/api/me/skills/declare', (req: Request, res: Response) => {
  const { userId = 'demo_user_01', skillId, proficiencyScore = 0.6 } = req.body;

  if (!skillId) {
    return res.status(400).json({ error: 'skillId is required' });
  }

  const userEvidence = store.evidence.get(userId) || [];
  const existingIdx = userEvidence.findIndex(e => e.skillId === skillId && e.sourceType === 'SELF_REPORTED');

  const newEv: SkillEvidence = {
    id: `ev_self_${Date.now()}`,
    userId,
    skillId,
    sourceType: 'SELF_REPORTED',
    proficiencyScore: Math.min(Math.max(proficiencyScore, 0), 1),
    confidence: 'LOW',
    createdAt: new Date().toISOString()
  };

  if (existingIdx >= 0) {
    userEvidence[existingIdx] = newEv;
  } else {
    userEvidence.push(newEv);
  }

  store.evidence.set(userId, userEvidence);
  res.json({ success: true, evidence: newEv });
});

// 4. Roles & Skills
app.get('/api/roles', (req: Request, res: Response) => {
  res.json(Array.from(store.roles.values()));
});

app.get('/api/roles/:id', (req: Request, res: Response) => {
  const role = store.roles.get(req.params.id);
  if (!role) {
    return res.status(404).json({ error: 'Role not found' });
  }
  res.json(role);
});

app.get('/api/skills', (req: Request, res: Response) => {
  res.json(Array.from(store.skills.values()));
});

// 5. Assessments
app.get('/api/assessments', (req: Request, res: Response) => {
  // Strip correct answers when listing assessments
  const list = Array.from(store.assessments.values()).map(a => ({
    ...a,
    questions: a.questions?.map(q => ({
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
  }));
  res.json(list);
});

app.get('/api/assessments/:id', (req: Request, res: Response) => {
  const assessment = store.assessments.get(req.params.id);
  if (!assessment) {
    return res.status(404).json({ error: 'Assessment not found' });
  }

  // Strip answers for test taking
  const safeAssessment = {
    ...assessment,
    questions: assessment.questions?.map(q => ({
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

  res.json(safeAssessment);
});

// Submit Assessment and Evaluate
app.post('/api/assessments/:id/submit', (req: Request, res: Response) => {
  const assessment = store.assessments.get(req.params.id);
  if (!assessment || !assessment.questions) {
    return res.status(404).json({ error: 'Assessment not found' });
  }

  const { userId = 'demo_user_01', answers } = req.body as {
    userId: string;
    answers: AssessmentSubmissionAnswer[];
  };

  const userAnswersMap = new Map<string, string>();
  for (const ans of answers || []) {
    userAnswersMap.set(ans.questionId, ans.selectedAnswer);
  }

  let totalPointsEarned = 0;
  let maxPoints = 0;
  const subSkillPoints: Record<string, { earned: number; total: number }> = {};

  for (const q of assessment.questions) {
    maxPoints += q.points;
    if (!subSkillPoints[q.subSkill]) {
      subSkillPoints[q.subSkill] = { earned: 0, total: 0 };
    }
    subSkillPoints[q.subSkill].total += q.points;

    const userSelected = userAnswersMap.get(q.id);
    if (userSelected && userSelected.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()) {
      totalPointsEarned += q.points;
      subSkillPoints[q.subSkill].earned += q.points;
    }
  }

  const percentageScore = maxPoints > 0 ? Math.round((totalPointsEarned / maxPoints) * 100) : 0;
  const passed = percentageScore >= assessment.passingScore;

  const subSkillScores: SubSkillResult[] = Object.entries(subSkillPoints).map(([subSkill, p]) => {
    const pct = p.total > 0 ? Math.round((p.earned / p.total) * 100) : 0;
    let status: 'STRENGTH' | 'MODERATE' | 'NEEDS_WORK' = 'NEEDS_WORK';
    if (pct >= 80) status = 'STRENGTH';
    else if (pct >= 50) status = 'MODERATE';

    return {
      subSkill,
      earnedPoints: p.earned,
      totalPoints: p.total,
      percentage: pct,
      status
    };
  });

  const attemptId = `attempt_${Date.now()}`;
  const attempt: AssessmentAttempt = {
    id: attemptId,
    userId,
    assessmentId: assessment.id,
    startedAt: new Date(Date.now() - 10 * 60000).toISOString(),
    completedAt: new Date().toISOString(),
    score: percentageScore,
    totalPointsEarned,
    maxPoints,
    passed,
    subSkillScores,
    status: 'COMPLETED'
  };

  store.attempts.set(attemptId, attempt);

  // Update verified skill evidence records
  const userEvidence = store.evidence.get(userId) || [];
  const proficiency = percentageScore / 100.0;

  // Add verified assessment evidence for tested skills
  const testedSkills = ['skill_javascript', 'skill_nodejs', 'skill_sql', 'skill_postgresql', 'skill_rest_api', 'skill_docker'];
  for (const skillId of testedSkills) {
    const existingIdx = userEvidence.findIndex(e => e.skillId === skillId && e.sourceType === 'ASSESSMENT');
    const newEv: SkillEvidence = {
      id: `ev_test_${Date.now()}_${skillId}`,
      userId,
      skillId,
      sourceType: 'ASSESSMENT',
      sourceId: attemptId,
      proficiencyScore: proficiency,
      confidence: 'HIGH',
      createdAt: new Date().toISOString()
    };

    if (existingIdx >= 0) {
      userEvidence[existingIdx] = newEv;
    } else {
      userEvidence.push(newEv);
    }
  }

  store.evidence.set(userId, userEvidence);

  // Re-calculate skill gaps immediately
  const gaps = gapService.calculateGaps(userId, 'role_junior_backend');

  res.json({
    attempt,
    gaps,
    detailedQuestions: assessment.questions.map(q => ({
      id: q.id,
      prompt: q.prompt,
      userAnswer: userAnswersMap.get(q.id) || null,
      correctAnswer: q.correctAnswer,
      isCorrect: (userAnswersMap.get(q.id) || '').trim().toLowerCase() === q.correctAnswer.trim().toLowerCase(),
      explanation: q.explanation,
      subSkill: q.subSkill
    }))
  });
});

// 6. User Evidence, Gaps & Recommendations
app.get('/api/me/evidence', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'demo_user_01';
  const evidenceList = store.evidence.get(userId) || [];
  const enriched = evidenceList.map(e => ({
    ...e,
    skill: store.skills.get(e.skillId)
  }));
  res.json(enriched);
});

app.get('/api/me/gaps', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'demo_user_01';
  const roleId = (req.query.roleId as string) || 'role_junior_backend';
  const gaps = gapService.calculateGaps(userId, roleId);
  res.json(gaps);
});

app.get('/api/me/recommendations', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'demo_user_01';
  const recs = store.recommendations.get(userId) || [];
  res.json(recs);
});

// 7. Jobs & Explainable Matching
app.get('/api/jobs', (req: Request, res: Response) => {
  res.json(Array.from(store.jobs.values()));
});

app.get('/api/jobs/matches', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'demo_user_01';
  const matches = matchService.matchAllJobs(userId);
  res.json(matches);
});

app.get('/api/jobs/:id/match', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'demo_user_01';
  const match = matchService.matchJob(userId, req.params.id);
  res.json(match);
});

app.listen(PORT, () => {
  console.log(`[SkillBridge API] Server running at http://localhost:${PORT}`);
});
