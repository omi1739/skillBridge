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
import { getAIProvider } from './ai-provider';
import { questionValidationService } from './question-validation.service';

/**
 * Batch question generation (admin flow). Each request creates a generation
 * job, asks the configured AI provider, validates the output, and stores
 * valid questions in `pending_review` for human approval.
 *
 * If no AI provider is configured the request fails gracefully with a clear
 * message rather than producing low-quality questions or blocking anything.
 */
export class QuestionGenerationService {
  async generate(req: QuestionGenerationRequest): Promise<QuestionGenerationResult> {
    const provider = getAIProvider();
    if (!provider) {
      throw new ServiceUnavailableException(
        'AI question generation is not configured (missing OPENAI_API_KEY). Questions can still be authored or seeded directly.'
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

    try {
      generated = await provider.generateQuestions(req);
    } catch (err: any) {
      const message = `Provider error: ${err.message}`;
      errors.push(message);
      await completeGenerationJob(jobId, req.count > 0 && generated.length === 0 ? 'failed' : 'partial', {
        jobId,
        created: 0,
        rejected: 0,
        errors
      });
      throw new ServiceUnavailableException(message);
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
