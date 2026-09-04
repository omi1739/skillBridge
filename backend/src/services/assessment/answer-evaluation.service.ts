import { BankQuestion } from '@skillbridge/types';

/**
 * Evaluates a candidate's submitted answer against the trusted correct answer
 * stored in the database. The frontend NEVER determines correctness; all
 * evaluation happens here on the server.
 */
export class AnswerEvaluationService {
  private static arraysEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    const sa = [...a].sort();
    const sb = [...b].sort();
    return sa.every((v, i) => v === sb[i]);
  }

  /**
   * Compare a submitted answer to the question's correct answer.
   *
   * - single-answer questions (MCQ / true_false / code_output): case-trimmed
   *   equality of the selected option string (or the text for code_output).
   * - multiple_select: submitted non-empty selection must equal the expected
   *   set (order-independent).
   */
  evaluate(question: BankQuestion, submitted: unknown): boolean {
    if (question.questionType === 'multiple_select') {
      const expected = Array.isArray(question.correctAnswer)
        ? question.correctAnswer
        : [question.correctAnswer];
      if (!Array.isArray(submitted)) return false;
      const chosen = submitted.map(String).filter(v => v !== '');
      return AnswerEvaluationService.arraysEqual(chosen, expected);
    }

    // code_output can be free-form text, so accept any of several accepted
    // answers and compare with whitespace-insensitive normalization so that
    // minor spacing/newline differences do not fail a correct answer.
    if (question.questionType === 'code_output') {
      const normalized = normalize(String(submitted ?? ''));
      const accepted = Array.isArray(question.correctAnswer)
        ? question.correctAnswer
        : [question.correctAnswer];
      return accepted.some(a => normalize(String(a ?? '')) === normalized);
    }

    const expected = Array.isArray(question.correctAnswer)
      ? question.correctAnswer[0]
      : question.correctAnswer;
    return normalize(String(submitted ?? '')) === normalize(String(expected ?? ''));
  }

  /**
   * Partial credit for `multiple_select`: returns the fraction of the total
   * weight (0..1) the submission earns.
   *
   *   - Exact match (same set, any order)          -> 1.0
   *   - Only correct options selected, no wrong    -> correctCount / totalCorrect
   *   - Any incorrect/extra option selected        -> 0.0 (penalizes guessing wrong)
   */
  partialCredit(question: BankQuestion, submitted: unknown): number {
    if (question.questionType !== 'multiple_select') {
      return this.evaluate(question, submitted) ? 1 : 0;
    }
    const expected = new Set(
      (Array.isArray(question.correctAnswer) ? question.correctAnswer : [question.correctAnswer]).map(String)
    );
    if (!Array.isArray(submitted)) return 0;
    const chosen = submitted.map(String).filter(v => v !== '');

    if (expected.size === 0) return chosen.length === 0 ? 1 : 0;

    // Exact match earns full credit.
    if (
      chosen.length === expected.size &&
      chosen.every(c => expected.has(c))
    ) {
      return 1;
    }

    // Any extra/wrong option disqualifies partial credit.
    if (chosen.some(c => !expected.has(c))) return 0;

    // Otherwise, proportion of correct options selected.
    return chosen.length / expected.size;
  }
}

/** Collapses internal whitespace runs to a single space and case-folds. */
function normalize(v: string): string {
  return v.replace(/\s+/g, ' ').trim().toLowerCase();
}

export const answerEvaluationService = new AnswerEvaluationService();
