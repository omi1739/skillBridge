import { AssessmentConfig, BankQuestion, QuestionDifficulty } from '@skillbridge/types';
import { getBankQuestions } from '../../store/assessment.store';

/**
 * Question selection for skill assessments.
 *
 * Controlled randomization: a configurable number of easy/medium/hard questions
 * are drawn per assessment, secured on the backend. Questions the user has seen
 * recently are deprioritized when enough alternatives exist, but selection still
 * degrades gracefully on a small bank.
 *
 * Personalization hooks (QuestionSelector) are abstracted so future versions can
 * weight topics by prior performance without rewriting the engine.
 */

export interface SelectionContext {
  skillId: string;
  usedQuestionIds: Set<string>; // questions the user answered in previous attempts
  topicWeights?: Map<string, number>; // future: bias selection toward weak topics
}

export interface QuestionSelector {
  selectQuestions(cfg: AssessmentConfig, ctx: SelectionContext): Promise<BankQuestion[]>;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class QuestionSelectionService implements QuestionSelector {
  async selectQuestions(cfg: AssessmentConfig, ctx: SelectionContext): Promise<BankQuestion[]> {
    const all = await getBankQuestions({ skillId: cfg.skillId, status: 'approved' });
    if (all.length === 0) {
      return [];
    }

    const byDifficulty: Record<QuestionDifficulty, BankQuestion[]> = {
      easy: [],
      medium: [],
      hard: []
    };
    for (const q of all) byDifficulty[q.difficulty].push(q);

    const allocation: Array<[QuestionDifficulty, number]> = [
      ['easy', cfg.easyCount],
      ['medium', cfg.mediumCount],
      ['hard', cfg.hardCount]
    ];

    const selected: BankQuestion[] = [];

    for (const [difficulty, count] of allocation) {
      const pool = byDifficulty[difficulty];
      if (pool.length === 0) continue;

      // Prefer questions the user has not already answered (fresh content),
      // but only as many as exist; never hard-fail a small bank.
      const unseen = pool.filter(q => !ctx.usedQuestionIds.has(q.id));
      const source = shuffle(unseen.length > 0 ? unseen : pool);

      let picked = 0;
      for (const q of source) {
        if (picked >= count) break;
        if (selected.length >= cfg.totalQuestions) break;
        selected.push(q);
        picked++;
        // Remove from all difficulty pools so a question is not picked twice.
        byDifficulty.easy = byDifficulty.easy.filter(x => x.id !== q.id);
        byDifficulty.medium = byDifficulty.medium.filter(x => x.id !== q.id);
        byDifficulty.hard = byDifficulty.hard.filter(x => x.id !== q.id);
      }
    }

    // If any difficulty bucket still had room (e.g. ran out of questions of that
    // difficulty), top up from the full remaining pool so the requested total is
    // met when the bank allows it.
    if (selected.length < cfg.totalQuestions) {
      const remaining = shuffle(
        all.filter(q => !selected.some(s => s.id === q.id))
      );
      for (const q of remaining) {
        if (selected.length >= cfg.totalQuestions) break;
        selected.push(q);
      }
    }

    return selected;
  }
}

export const questionSelectionService = new QuestionSelectionService();
