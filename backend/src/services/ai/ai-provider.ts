import { AiGeneratedQuestion, QuestionGenerationRequest } from '@skillbridge/types';

/**
 * Provider abstraction for AI question generation. The concrete provider is
 * selected at runtime from configuration; if no provider is configured (no API
 * key), `getAIProvider()` returns null and callers fall back to the bank —
 * AI generation never blocks normal usage.
 */
export interface AIProvider {
  readonly name: string;
  available: boolean;
  generateQuestions(req: QuestionGenerationRequest): Promise<AiGeneratedQuestion[]>;
}

const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const OPENAI_KEY = process.env.OPENAI_API_KEY || '';

export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';
  get available(): boolean {
    return Boolean(OPENAI_KEY);
  }

  private async chatJson(messages: Array<{ role: string; content: string }>): Promise<any> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages,
        temperature: 0.7,
        response_format: { type: 'json_object' }
      })
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenAI request failed (${res.status}): ${text}`);
    }
    const json: any = await res.json();
    const content: string = json?.choices?.[0]?.message?.content || '';
    return JSON.parse(content);
  }

  async generateQuestions(req: QuestionGenerationRequest): Promise<AiGeneratedQuestion[]> {
    const typeDesc =
      req.questionType === 'multiple_select'
        ? 'single best answer with a multi-select variant (multiple correct options), where options exclude distractors'
        : req.questionType === 'true_false'
          ? 'true/false'
          : req.questionType === 'code_output'
            ? 'predict the output of a code snippet (provide codeSnippet)'
            : 'multiple choice';

    const systemPrompt =
      'You are a senior technical interviewer generating precise, unambiguous ' +
      'assessment questions. Respond ONLY with valid JSON of shape: ' +
      '{"questions":[{questionText, codeSnippet?, questionType, difficulty, topic, options, correctAnswer, explanation}]}. ' +
      'For multiple_select, options must include distractors and correctAnswer must be an ARRAY of the correct option strings. ' +
      'For MCQ/true_false, correctAnswer is a single option string. questionType must be one of ' +
      'MCQ|multiple_select|true_false|code_output. difficulty must be easy|medium|hard. ' +
      'Never reveal the correct answer in questionText. Explanations must be concise and correct.';

    const userPrompt =
      'Generate exactly ' + req.count + ' ' + req.difficulty + ' assessment question(s) for skill "' + req.skillId + '" ' +
      'on topic "' + req.topic + '". Question style: ' + typeDesc + '. Make each distinct and realistic.';

    const parsed = await this.chatJson([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);

    const list: any[] = Array.isArray(parsed?.questions) ? parsed.questions : [];
    return list
      .slice(0, req.count)
      .map((q: any) => ({
        questionText: String(q?.questionText || ''),
        codeSnippet: q?.codeSnippet ? String(q.codeSnippet) : undefined,
        questionType: q?.questionType as AiGeneratedQuestion['questionType'],
        difficulty: req.difficulty,
        topic: req.topic,
        options: Array.isArray(q?.options) ? q.options.map(String) : [],
        correctAnswer: Array.isArray(q?.correctAnswer)
          ? q.correctAnswer.map(String)
          : String(q?.correctAnswer || ''),
        explanation: String(q?.explanation || '')
      }));
  }
}

let cachedProvider: AIProvider | null | undefined;

export function getAIProvider(): AIProvider | null {
  if (cachedProvider === undefined) {
    const openai = new OpenAIProvider();
    cachedProvider = openai.available ? openai : null;
  }
  return cachedProvider;
}
