import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import {
  AiGeneratedQuestion,
  QuestionGenerationRequest,
  QuestionGenerationResult
} from '@skillbridge/types';
import {
  createGenerationJob,
  completeGenerationJob,
  upsertBankQuestion
} from '../../store/assessment.store';
import { getAIProviders } from './ai-provider';
import { questionValidationService } from './question-validation.service';

/**
 * Batch question generation (admin flow). Each request creates a generation
 * job, asks the configured AI provider, validates the output, and stores
 * valid questions in `pending_review` for human approval.
 *
 * Providers are tried in priority order (Gemini free tier first, then OpenAI),
 * each with retry/backoff for transient errors, so a single provider outage
 * doesn't fail the whole request. If no AI provider is configured the request
 * fails gracefully with a clear message rather than producing low-quality
 * questions or blocking anything.
 */

/** Hard ceiling across every provider attempt so the HTTP request cannot hang. */
const GENERATION_BUDGET_MS = Number(process.env.AI_GENERATION_TIMEOUT_MS || 40_000);

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`AI generation timed out after ${ms}ms`)),
      Math.max(1000, ms)
    );
    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      err => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export class QuestionGenerationService {
  async generate(req: QuestionGenerationRequest): Promise<QuestionGenerationResult> {
    const providers = getAIProviders();
    if (providers.length === 0) {
      throw new ServiceUnavailableException(
        'AI question generation is not configured (set GEMINI_API_KEY or OPENAI_API_KEY). Questions can still be authored or seeded directly.'
      );
    }

    const jobId = await createGenerationJob({
      skillId: req.skillId,
      topic: req.topic,
      difficulty: req.difficulty,
      questionType: req.questionType,
      count: req.count
    });

    let generated: AiGeneratedQuestion[] = [];
    const errors: string[] = [];
    let succeeded = false;
    const deadline = Date.now() + GENERATION_BUDGET_MS;

    for (const provider of providers) {
      const remaining = deadline - Date.now();
      if (remaining < 1000) {
        errors.push('Overall AI generation budget exceeded before trying all providers.');
        break;
      }
      try {
        generated = await withTimeout(provider.generateQuestions(req), remaining);
        succeeded = true;
        break;
      } catch (err: any) {
        errors.push(`Provider ${provider.name} failed: ${err.message}`);
      }
    }

    if (!succeeded) {
      const message = errors.join('; ');
      await completeGenerationJob(jobId, 'failed', {
        jobId,
        created: 0,
        rejected: 0,
        errors
      });
      throw new ServiceUnavailableException(
        message || `AI question generation failed (${providers.map(p => p.name).join(', ')})`
      );
    }

    if (generated.length === 0) {
      await completeGenerationJob(jobId, 'failed', { jobId, created: 0, rejected: 0, errors: ['No questions generated'] });
      throw new BadRequestException('AI returned no usable questions');
    }

    const failures = await questionValidationService.validate(generated);
    const rejectedIndexes = new Set(failures.map(f => f.index));

    let created = 0;
    generated.forEach((q, i) => {
      if (rejectedIndexes.has(i)) return;
      const baseId = `ai_${req.skillId}_${req.topic}_${Date.now()}_${i}`;
      upsertBankQuestion({
        id: baseId.replace(/[^a-zA-Z0-9_]/g, '_'),
        skillId: req.skillId,
        topic: req.topic,
        difficulty: req.difficulty,
        questionType: q.questionType,
        questionText: q.questionText,
        codeSnippet: q.codeSnippet,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        verificationStatus: 'pending_review',
        createdBy: 'ai'
      });
      created++;
    });

    for (const f of failures) {
      errors.push(`Question #${f.index + 1}: ${f.reasons.join('; ')}`);
    }

    await completeGenerationJob(jobId, 'completed', { jobId, created, rejected: failures.length, errors });

    return { jobId, created, rejected: failures.length, errors };
  }
}

export const questionGenerationService = new QuestionGenerationService();
