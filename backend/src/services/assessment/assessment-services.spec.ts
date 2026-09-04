import { skillLevelForScore, ScoringService, DIFFICULTY_WEIGHTS } from './scoring.service';
import { answerEvaluationService } from './answer-evaluation.service';
import { QuestionSelectionService } from './question-selection.service';
import { BankQuestion } from '@skillbridge/types';

jest.mock('../../store/assessment.store');

import { getBankQuestions } from '../../store/assessment.store';

const mockGetBankQuestions = getBankQuestions as jest.MockedFunction<typeof getBankQuestions>;

function makeQuestions(difficulty: 'easy' | 'medium' | 'hard', n: number): BankQuestion[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${difficulty}_${i}`,
    skillId: 'skill_js',
    topic: 'General',
    difficulty,
    questionType: 'MCQ' as BankQuestion['questionType'],
    questionText: `${difficulty} ${i}`,
    options: ['A', 'B'],
    correctAnswer: 'A',
    explanation: 'e',
    verificationStatus: 'approved'
  }));
}

const bankQuestions: BankQuestion[] = [
  ...makeQuestions('easy', 4),
  ...makeQuestions('medium', 6),
  ...makeQuestions('hard', 4)
];

describe('ScoringService', () => {
  const scoring = new ScoringService();

  it('calculates weighted score as a rounded 0-100 integer', () => {
    expect(scoring.calculateScore(3, 6)).toBe(50);
    expect(scoring.calculateScore(0, 10)).toBe(0);
    expect(scoring.calculateScore(10, 10)).toBe(100);
    expect(scoring.calculateScore(0, 0)).toBe(0);
  });

  it('maps score to skill levels', () => {
    expect(skillLevelForScore(0)).toBe('Beginner');
    expect(skillLevelForScore(39)).toBe('Beginner');
    expect(skillLevelForScore(40)).toBe('Developing');
    expect(skillLevelForScore(69)).toBe('Developing');
    expect(skillLevelForScore(70)).toBe('Intermediate');
    expect(skillLevelForScore(84)).toBe('Intermediate');
    expect(skillLevelForScore(85)).toBe('Advanced');
    expect(skillLevelForScore(100)).toBe('Advanced');
  });

  it('has the expected difficulty weights', () => {
    expect(DIFFICULTY_WEIGHTS).toEqual({ easy: 1, medium: 2, hard: 3 });
  });

  it('computes topic strengths and needs-improvement lists', () => {
    const results = scoring.topicResults({
      Promises: { earned: 6, total: 6 },
      Arrays: { earned: 2, total: 4 },
      HTTP: { earned: 1, total: 4 }
    });
    expect(scoring.strengths(results)).toEqual(['Promises']);
    expect(scoring.needsImprovement(results)).toEqual(['HTTP']);
    expect(results.find(r => r.topic === 'Promises')?.status).toBe('STRENGTH');
    expect(results.find(r => r.topic === 'HTTP')?.percentage).toBe(25);
  });
});

describe('AnswerEvaluationService', () => {
  const base = (over: Partial<BankQuestion>): BankQuestion => ({
    id: 'q1',
    skillId: 'skill_js',
    topic: 'Arrays',
    difficulty: 'medium',
    questionType: 'MCQ',
    questionText: 'text',
    options: ['A', 'B'],
    correctAnswer: 'B',
    explanation: 'e',
    verificationStatus: 'approved',
    ...over
  });

  it('evaluates MCQ case-insensitively after trimming', () => {
    expect(answerEvaluationService.evaluate(base({}), ' b ')).toBe(true);
    expect(answerEvaluationService.evaluate(base({}), 'a')).toBe(false);
  });

  it('evaluates multiple_select with order-independent set equality', () => {
    const q = base({ questionType: 'multiple_select', correctAnswer: ['sort()', 'splice()'] });
    expect(answerEvaluationService.evaluate(q, ['splice()', 'sort()'])).toBe(true);
    expect(answerEvaluationService.evaluate(q, ['sort()'])).toBe(false);
    expect(answerEvaluationService.evaluate(q, ['sort()', 'splice()', 'push()'])).toBe(false);
    expect(answerEvaluationService.evaluate(q, null)).toBe(false);
  });

  it('evaluates true_false scalar', () => {
    const q = base({ questionType: 'true_false', correctAnswer: 'True' });
    expect(answerEvaluationService.evaluate(q, 'true')).toBe(true);
  });

  it('evaluates code_output by text equality', () => {
    const q = base({ questionType: 'code_output', correctAnswer: '2,4' });
    expect(answerEvaluationService.evaluate(q, ' 2,4 ')).toBe(true);
    expect(answerEvaluationService.evaluate(q, '10')).toBe(false);
  });

  it('collapses whitespace for code_output so newline/spacing differences pass', () => {
    const q = base({ questionType: 'code_output', correctAnswer: '2\n1' });
    expect(answerEvaluationService.evaluate(q, '2 1')).toBe(true);
    expect(answerEvaluationService.evaluate(q, '\n\n 2 1 ')).toBe(true);
    expect(answerEvaluationService.evaluate(q, '1 2')).toBe(false);
  });

  it('code_output accepts any of several acceptable answers', () => {
    const q = base({ questionType: 'code_output', correctAnswer: ['3', '3.0'] });
    expect(answerEvaluationService.evaluate(q, '3')).toBe(true);
    expect(answerEvaluationService.evaluate(q, '3.0')).toBe(true);
    expect(answerEvaluationService.evaluate(q, '4')).toBe(false);
  });

  it('multiple_select exact match earns full and partial subsets earn proportional credit', () => {
    const q = base({ questionType: 'multiple_select', correctAnswer: ['sort()', 'splice()', 'push()'] });
    expect(answerEvaluationService.partialCredit(q, ['splice()', 'push()', 'sort()'])).toBe(1);
    expect(answerEvaluationService.partialCredit(q, ['sort()', 'splice()'])).toBeCloseTo(2 / 3);
    expect(answerEvaluationService.partialCredit(q, ['sort()'])).toBeCloseTo(1 / 3);
    expect(answerEvaluationService.partialCredit(q, ['sort()', 'push()', 'pop()'])).toBe(0);
    expect(answerEvaluationService.partialCredit(q, null)).toBe(0);
  });

  it('partialCredit for non-multiple_select returns 1 if correct else 0', () => {
    const q = base({ questionType: 'MCQ', correctAnswer: 'B' });
    expect(answerEvaluationService.partialCredit(q, 'b')).toBe(1);
    expect(answerEvaluationService.partialCredit(q, 'A')).toBe(0);
  });
});

describe('QuestionSelectionService', () => {
  mockGetBankQuestions.mockResolvedValue(bankQuestions);

  it('respects the requested per-difficulty allocation', async () => {
    const service = new QuestionSelectionService();
    const selected = await service.selectQuestions(
      { skillId: 'skill_js', totalQuestions: 10, easyCount: 2, mediumCount: 5, hardCount: 3 },
      { skillId: 'skill_js', usedQuestionIds: new Set<string>() }
    );
    expect(selected.length).toBe(10);
    expect(selected.filter(q => q.difficulty === 'easy').length).toBe(2);
    expect(selected.filter(q => q.difficulty === 'medium').length).toBe(5);
    expect(selected.filter(q => q.difficulty === 'hard').length).toBe(3);
    expect(new Set(selected.map(q => q.id)).size).toBe(10);
  });

  it('never returns duplicate questions', async () => {
    const service = new QuestionSelectionService();
    const selected = await service.selectQuestions(
      { skillId: 'skill_js', totalQuestions: 7, easyCount: 1, mediumCount: 3, hardCount: 3 },
      { skillId: 'skill_js', usedQuestionIds: new Set<string>() }
    );
    expect(new Set(selected.map(q => q.id)).size).toBe(selected.length);
  });

  it('returns an empty set when the bank has no approved questions', async () => {
    mockGetBankQuestions.mockResolvedValueOnce([]);
    const service = new QuestionSelectionService();
    const selected = await service.selectQuestions(
      { skillId: 'skill_js', totalQuestions: 5, easyCount: 2, mediumCount: 2, hardCount: 1 },
      { skillId: 'skill_js', usedQuestionIds: new Set<string>() }
    );
    expect(selected).toEqual([]);
  });

  it('gives a different user a disjoint set when the bank has enough fresh questions', async () => {
    mockGetBankQuestions.mockResolvedValue(bankQuestions);
    const service = new QuestionSelectionService();
    const cfg = { skillId: 'skill_js', totalQuestions: 6, easyCount: 2, mediumCount: 2, hardCount: 2 };

    // First user picks 6 of the 14 questions.
    const first = await service.selectQuestions(cfg, { skillId: 'skill_js', usedQuestionIds: new Set<string>() });
    const firstIds = new Set(first.map(q => q.id));

    // A second user has all of the first user's questions marked seen, so they
    // must receive a set that does NOT overlap at all (bank has room).
    const second = await service.selectQuestions(cfg, { skillId: 'skill_js', usedQuestionIds: firstIds });
    for (const q of second) {
      expect(firstIds.has(q.id)).toBe(false);
    }
  });

  it('degrades gracefully on a small bank: tops up without duplicates to meet the total', async () => {
    mockGetBankQuestions.mockResolvedValue(bankQuestions);
    const service = new QuestionSelectionService();
    // Asks for more medium than exist (8 of only 6), so the 2 shortfall is
    // topped up from other difficulties without creating duplicates.
    const selected = await service.selectQuestions(
      { skillId: 'skill_js', totalQuestions: 14, easyCount: 2, mediumCount: 8, hardCount: 4 },
      { skillId: 'skill_js', usedQuestionIds: new Set<string>() }
    );
    expect(selected.length).toBe(14);
    expect(new Set(selected.map(q => q.id)).size).toBe(14);
    // Medium could only contribute its 6 available questions.
    expect(selected.filter(q => q.difficulty === 'medium').length).toBeLessThanOrEqual(6);
  });

  it('prefers unseen questions but still falls back when all have been used', async () => {
    mockGetBankQuestions.mockResolvedValue(bankQuestions);
    const service = new QuestionSelectionService();
    const cfg = { skillId: 'skill_js', totalQuestions: 4, easyCount: 1, mediumCount: 2, hardCount: 1 };
    // Mark every easy question as "used" so selection must fall back to them
    // (the only easy questions available), returning a valid set.
    const usedAllEasy = new Set(bankQuestions.filter(q => q.difficulty === 'easy').map(q => q.id));
    const selected = await service.selectQuestions(cfg, { skillId: 'skill_js', usedQuestionIds: usedAllEasy });
    expect(selected.length).toBe(4);
    expect(selected.filter(q => q.difficulty === 'easy').length).toBe(1);
  });
});
