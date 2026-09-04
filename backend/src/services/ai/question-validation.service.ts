import { AiGeneratedQuestion, QuestionDifficulty, ValidationFailure } from '@skillbridge/types';
import { query } from '../../db/client';

const DIFFICULTIES: QuestionDifficulty[] = ['easy', 'medium', 'hard'];
const TYPES = ['MCQ', 'multiple_select', 'true_false', 'code_output'];

/**
 * Validates AI-generated questions before they enter the bank. Correctness is
 * structural + heuristic here; questions are still held in `pending_review`
 * for a human admin to approve. Duplicate detection avoids obvious repeats.
 */
export class QuestionValidationService {
  async validate(questions: AiGeneratedQuestion[]): Promise<ValidationFailure[]> {
    const existingFingerprints = await this.loadExistingFingerprints();
    const failures: ValidationFailure[] = [];

    questions.forEach((q, i) => {
      const reasons: string[] = [];

      if (!q.questionText || q.questionText.trim().length < 10) {
        reasons.push('questionText is too short');
      }
      if (!DIFFICULTIES.includes(q.difficulty)) {
        reasons.push('invalid difficulty');
      }
      if (!TYPES.includes(q.questionType)) {
        reasons.push('invalid questionType');
      }
      if (q.questionType === 'code_output' && !q.codeSnippet) {
        reasons.push('code_output questions require a codeSnippet');
      }
      if (!q.explanation || q.explanation.trim().length < 5) {
        reasons.push('explanation is missing or too short');
      }

      if (q.questionType === 'multiple_select') {
        if (!Array.isArray(q.correctAnswer) || q.correctAnswer.length === 0) {
          reasons.push('multiple_select requires a non-empty correctAnswer array');
        }
      } else {
        const required = ['MCQ', 'true_false'].includes(q.questionType);
        if (q.questionType !== 'code_output') {
          if (!Array.isArray(q.options) || q.options.length < 2) {
            reasons.push('question requires at least 2 options');
          }
          if (required && !q.options.includes(String(q.correctAnswer))) {
            reasons.push('correctAnswer is not among the options');
          }
        }
        if (Array.isArray(q.correctAnswer)) {
          reasons.push('non-multiple_select must have a scalar correctAnswer');
        }
      }

      const fingerprint = this.fingerprint(q.questionText);
      if (existingFingerprints.has(fingerprint)) {
        reasons.push('duplicate of an existing question');
      }

      if (reasons.length) failures.push({ index: i, reasons });
    });

    return failures;
  }

  private async loadExistingFingerprints(): Promise<Set<string>> {
    const rows = await query<any>(`SELECT question_text FROM questions WHERE question_text IS NOT NULL`);
    const set = new Set<string>();
    for (const r of rows) set.add(this.fingerprint(r.question_text));
    return set;
  }

  private fingerprint(text: string): string {
    return text.replace(/\s+/g, ' ').trim().toLowerCase();
  }
}

export const questionValidationService = new QuestionValidationService();
