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
import { sandboxService } from './services/sandbox.service';
import { projectService } from './services/project.service';
import { curriculumService } from './services/curriculum.service';

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
app.get('/api/me', async (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'demo_user_01';
  const [user, profile] = await Promise.all([
    store.getUser(userId),
    store.getProfile(userId)
  ]);

  if (!user || !profile) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ user, profile });
});

app.patch('/api/me/profile', async (req: Request, res: Response) => {
  const userId = (req.body.userId as string) || 'demo_user_01';
  const profile = await store.getProfile(userId);
  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  const updated = await store.saveProfile(userId, {
    fullName: req.body.fullName ?? profile.fullName,
    targetRoleId: req.body.targetRoleId ?? profile.targetRoleId,
    githubUrl: req.body.githubUrl ?? profile.githubUrl,
    portfolioUrl: req.body.portfolioUrl ?? profile.portfolioUrl,
    bio: req.body.bio ?? profile.bio
  });

  res.json(updated);
});

// 3. Declare Self-Reported Skill
app.post('/api/me/skills/declare', async (req: Request, res: Response) => {
  const { userId = 'demo_user_01', skillId, proficiencyScore = 0.6 } = req.body;

  if (!skillId) {
    return res.status(400).json({ error: 'skillId is required' });
  }

  const userEvidence = await store.getEvidence(userId);
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

  await store.saveEvidence(userId, userEvidence);
  res.json({ success: true, evidence: newEv });
});

// 4. Roles & Skills
app.get('/api/roles', async (req: Request, res: Response) => {
  res.json(await store.getRoles());
});

app.get('/api/roles/:id', async (req: Request, res: Response) => {
  const role = await store.getRole(req.params.id);
  if (!role) {
    return res.status(404).json({ error: 'Role not found' });
  }
  res.json(role);
});

app.get('/api/skills', async (req: Request, res: Response) => {
  res.json(await store.getSkills());
});

// 5. Assessments
app.get('/api/assessments', async (req: Request, res: Response) => {
  const list = (await store.getAssessments()).map(a => ({
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

app.get('/api/assessments/:id', async (req: Request, res: Response) => {
  const assessment = await store.getAssessment(req.params.id);
  if (!assessment) {
    return res.status(404).json({ error: 'Assessment not found' });
  }

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
app.post('/api/assessments/:id/submit', async (req: Request, res: Response) => {
  const assessment = await store.getAssessment(req.params.id);
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

  await store.saveAttempt(attempt);

  const userEvidence = await store.getEvidence(userId);
  const proficiency = percentageScore / 100.0;

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

  await store.saveEvidence(userId, userEvidence);

  // Re-calculate skill gaps immediately
  const gaps = await gapService.calculateGaps(userId, 'role_junior_backend');

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
app.get('/api/me/evidence', async (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'demo_user_01';
  const [evidenceList, skills] = await Promise.all([
    store.getEvidence(userId),
    store.getSkills()
  ]);
  const skillMap = new Map(skills.map(s => [s.id, s]));
  const enriched = evidenceList.map(e => ({
    ...e,
    skill: skillMap.get(e.skillId)
  }));
  res.json(enriched);
});

app.get('/api/me/gaps', async (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'demo_user_01';
  const roleId = (req.query.roleId as string) || 'role_junior_backend';
  const gaps = await gapService.calculateGaps(userId, roleId);
  res.json(gaps);
});

app.get('/api/me/recommendations', async (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'demo_user_01';
  const recs = await store.getRecommendations(userId);
  res.json(recs);
});

// 8. Sandbox & Practical Code Runner
app.get('/api/sandbox/challenges', (req: Request, res: Response) => {
  res.json(sandboxService.getChallenges());
});

app.post('/api/sandbox/run-sql', async (req: Request, res: Response) => {
  const { challengeId, query, userId = 'demo_user_01' } = req.body;
  if (!challengeId || !query) {
    return res.status(400).json({ error: 'challengeId and query are required' });
  }

  const result = await sandboxService.executeSQL(challengeId, query, userId);
  res.json(result);
});

app.post('/api/sandbox/run-code', async (req: Request, res: Response) => {
  const { challengeId, code, userId = 'demo_user_01' } = req.body;
  if (!challengeId || !code) {
    return res.status(400).json({ error: 'challengeId and code are required' });
  }

  const result = await sandboxService.executeJavaScript(challengeId, code, userId);
  res.json(result);
});

// 9. Candidate Project & Portfolio Evidence
app.get('/api/me/projects', async (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'demo_user_01';
  res.json(await projectService.getProjects(userId));
});

app.post('/api/me/projects', async (req: Request, res: Response) => {
  const { userId = 'demo_user_01', title, repoUrl, description, primarySkills } = req.body;
  if (!title || !repoUrl) {
    return res.status(400).json({ error: 'Title and repoUrl are required' });
  }

  const result = await projectService.submitProject(userId, {
    title,
    repoUrl,
    description: description || '',
    primarySkills: primarySkills || ['Node.js', 'PostgreSQL', 'REST APIs', 'Docker']
  });

  res.json(result);
});

// 10. Candidate Career Report & Skill Passport
app.get('/api/me/report', async (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'demo_user_01';
  const [user, profile, userEvidence, recs, projects, skills] = await Promise.all([
    store.getUser(userId),
    store.getProfile(userId),
    store.getEvidence(userId),
    store.getRecommendations(userId),
    projectService.getProjects(userId),
    store.getSkills()
  ]);
  const targetRoleId = profile?.targetRoleId || 'role_junior_backend';
  const [role, gaps] = await Promise.all([
    store.getRole(targetRoleId),
    gapService.calculateGaps(userId, targetRoleId)
  ]);
  const targetRole = role?.title || 'Junior Backend Engineer';
  const skillMap = new Map(skills.map(s => [s.id, s]));

  const enrichedEvidence = userEvidence.map(e => ({
    ...e,
    skillName: skillMap.get(e.skillId)?.canonicalName || e.skillId,
    category: skillMap.get(e.skillId)?.category || 'General'
  }));

  const verifiedCount = userEvidence.filter(e => e.proficiencyScore >= 0.75).length;
  const overallAlignment = Math.round(
    (enrichedEvidence.reduce((acc, curr) => acc + curr.proficiencyScore, 0) / Math.max(enrichedEvidence.length, 1)) * 100
  );

  res.json({
    passportId: `SKILLBRIDGE-PASSPORT-${userId.toUpperCase()}`,
    issuedAt: new Date().toISOString(),
    candidate: {
      name: profile?.fullName || 'Candidate',
      email: user?.email || '',
      githubUrl: profile?.githubUrl || '',
      targetRole
    },
    metrics: {
      overallAlignment,
      verifiedSkillsCount: verifiedCount,
      totalTrackedSkills: 8,
      submittedProjectsCount: projects.length
    },
    evidence: enrichedEvidence,
    gaps,
    recommendations: recs,
    projects
  });
});

// 11. Curriculum vs. Market Intelligence
app.get('/api/curriculum/institutions', (req: Request, res: Response) => {
  res.json(curriculumService.getCurricula());
});

app.get('/api/curriculum/analyze', async (req: Request, res: Response) => {
  const institutionId = (req.query.institutionId as string) || 'curr_bsc_cse';
  const roleId = (req.query.roleId as string) || 'role_junior_backend';
  const analysis = await curriculumService.analyzeCurriculum(institutionId, roleId);
  res.json(analysis);
});

// 12. Admin & Research Console Endpoints
app.get('/api/admin/overview', async (req: Request, res: Response) => {
  const [skills, assessments, jobs, attemptsCount] = await Promise.all([
    store.getSkills(),
    store.getAssessments(),
    store.getJobs(),
    store.getAttemptsCount()
  ]);

  const totalAliases = skills.reduce((acc, s) => acc + s.aliases.length, 0);
  const totalQuestions = assessments.reduce((acc, a) => acc + (a.questions?.length || 0), 0);

  res.json({
    canonicalSkillsCount: skills.length,
    totalAliasesCount: totalAliases,
    totalJobsCount: jobs.length,
    totalQuestionsCount: totalQuestions,
    totalAttemptsCount: attemptsCount
  });
});

app.post('/api/admin/skills/alias', async (req: Request, res: Response) => {
  const { skillId, alias } = req.body;
  if (!skillId || !alias) {
    return res.status(400).json({ error: 'skillId and alias are required' });
  }

  const skill = await store.getSkill(skillId);
  if (!skill) {
    return res.status(404).json({ error: 'Skill not found' });
  }

  const cleanAlias = alias.trim().toLowerCase();
  await store.addAlias(skillId, cleanAlias);

  res.json({ success: true, skill: await store.getSkill(skillId) });
});

app.patch('/api/admin/roles/:id/weights', async (req: Request, res: Response) => {
  const role = await store.getRole(req.params.id);
  if (!role) {
    return res.status(404).json({ error: 'Role not found' });
  }

  const { skillId, roleWeight, marketDemandFrequency } = req.body;
  const roleSkill = role.roleSkills.find(rs => rs.skillId === skillId);
  if (!roleSkill) {
    return res.status(404).json({ error: 'Skill not in role' });
  }

  await store.updateRoleSkillWeights(role.id, skillId, {
    roleWeight: typeof roleWeight === 'number' ? Math.min(Math.max(roleWeight, 0), 1) : undefined,
    marketDemandFrequency: typeof marketDemandFrequency === 'number' ? Math.min(Math.max(marketDemandFrequency, 0), 1) : undefined
  });

  const updatedRole = await store.getRole(role.id);
  const updatedRoleSkill = updatedRole?.roleSkills.find(rs => rs.skillId === skillId);
  res.json({ success: true, roleSkill: updatedRoleSkill });
});

app.post('/api/admin/questions', async (req: Request, res: Response) => {
  const { assessmentId = 'assessment_backend_diagnostic', prompt, codeSnippet, questionType = 'MCQ', options, correctAnswer, explanation, subSkill, points = 15 } = req.body;
  if (!prompt || !correctAnswer || !subSkill) {
    return res.status(400).json({ error: 'prompt, correctAnswer, and subSkill are required' });
  }

  const assessment = await store.getAssessment(assessmentId);
  if (!assessment) {
    return res.status(404).json({ error: 'Assessment not found' });
  }

  const newQuestion = {
    id: `q_${Date.now()}`,
    assessmentId,
    prompt,
    codeSnippet,
    questionType,
    options: options || ['Option A', 'Option B', 'Option C', 'Option D'],
    correctAnswer,
    explanation: explanation || 'Standard verified answer.',
    subSkill,
    difficulty: 'Intermediate' as const,
    points
  };

  await store.addQuestion(newQuestion);

  res.json({ success: true, question: newQuestion });
});

// 7. Jobs & Explainable Matching
app.get('/api/jobs', async (req: Request, res: Response) => {
  res.json(await store.getJobs());
});

app.get('/api/jobs/matches', async (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'demo_user_01';
  const matches = await matchService.matchAllJobs(userId);
  res.json(matches);
});

app.get('/api/jobs/:id/match', async (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'demo_user_01';
  const match = await matchService.matchJob(userId, req.params.id);
  res.json(match);
});

app.listen(PORT, () => {
  console.log(`[SkillBridge API] Server running at http://localhost:${PORT}`);
});
