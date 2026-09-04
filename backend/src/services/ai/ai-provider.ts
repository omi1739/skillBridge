import { AiGeneratedQuestion, QuestionGenerationRequest } from '@skillbridge/types';

/**
 * Provider abstraction for AI question generation. The concrete provider is
 * selected at runtime from configuration; if no provider is configured (no API
 * key), `getAIProviders()` returns an empty list and callers fall back to the
 * bank — AI generation never blocks normal usage.
 *
 * Supported providers:
 *   - gemini (free tier via Google AI Studio, key: GEMINI_API_KEY)
 *   - openai (pay-per-use, key: OPENAI_API_KEY)
 *
 * Selection priority favours the free tier (Gemini) when a key is present, so
 * the MVP can stay at zero cost while still allowing a paid fallback. Transient
 * provider errors (429/5xx) are retried with exponential backoff, and if the
 * first provider is unavailable the next configured one is tried.
 */
export interface AIProvider {
  readonly name: string;
  available: boolean;
  generateQuestions(req: QuestionGenerationRequest): Promise<AiGeneratedQuestion[]>;
}

const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const OPENAI_KEY = process.env.OPENAI_API_KEY || '';
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

/** Shared prompt used by every provider so question quality is consistent. */
function buildSystemPrompt(): string {
  return (
    'You are a senior technical interviewer generating precise, unambiguous ' +
    'assessment questions. Respond ONLY with valid JSON of shape: ' +
    '{"questions":[{questionText, codeSnippet?, questionType, difficulty, topic, options, correctAnswer, explanation}]}. ' +
    'For multiple_select, options must include distractors and correctAnswer must be an ARRAY of the correct option strings. ' +
    'For MCQ/true_false, correctAnswer is a single option string. questionType must be one of ' +
    'MCQ|multiple_select|true_false|code_output. difficulty must be easy|medium|hard. ' +
    'Never reveal the correct answer in questionText. Explanations must be concise and correct.'
  );
}

function buildUserPrompt(req: QuestionGenerationRequest): string {
  const typeDesc =
    req.questionType === 'multiple_select'
      ? 'single best answer with a multi-select variant (multiple correct options), where options exclude distractors'
      : req.questionType === 'true_false'
        ? 'true/false'
        : req.questionType === 'code_output'
          ? 'predict the output of a code snippet (provide codeSnippet)'
          : 'multiple choice';
  return (
    'Generate exactly ' + req.count + ' ' + req.difficulty + ' assessment question(s) for skill "' + req.skillId + '" ' +
    'on topic "' + req.topic + '". Question style: ' + typeDesc + '. Make each distinct and realistic.'
  );
}

/** Normalize arbitrary AI JSON into the shared AiGeneratedQuestion shape. */
function mapQuestions(req: QuestionGenerationRequest, raw: any[]): AiGeneratedQuestion[] {
  return (raw || [])
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

/** True when an HTTP status is transient and worth retrying with backoff. */
function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

const RETRYABLE_DELAYS_MS = [800, 1600, 3200];

/**
 * Run an async fetch wrapper, retrying transient failures (429/5xx and network
 * errors) with exponential backoff. Returns the status + body of the response,
 * or throws the last error once all retries are exhausted.
 */
async function fetchWithRetry(
  doFetch: () => Promise<{ status: number; ok: boolean; body: string }>
): Promise<{ status: number; ok: boolean; body: string }> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= RETRYABLE_DELAYS_MS.length; attempt++) {
    let status = 0;
    try {
      const res = await doFetch();
      status = res.status;
      if (res.ok) return res;
      lastError = new Error(`HTTP ${res.status}: ${res.body.slice(0, 400)}`);
    } catch (err: any) {
      lastError = err;
    }
    // Non-transient HTTP status -> fail fast without more retries.
    if (status && !isRetryableStatus(status)) {
      throw lastError;
    }
    if (attempt < RETRYABLE_DELAYS_MS.length) {
      await sleep(RETRYABLE_DELAYS_MS[attempt]);
    }
  }
  throw lastError || new Error('Retry exhausted');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Google Gemini, via the free tier (AI Studio API key). */
export class GeminiProvider implements AIProvider {
  readonly name = 'gemini';
  get available(): boolean {
    return Boolean(GEMINI_KEY);
  }

  private async chatJson(contents: Array<{ role: string; parts: Array<{ text: string }> }>): Promise<any> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(GEMINI_KEY)}`;
    const { body } = await fetchWithRetry(async () => {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: { temperature: 0.7, responseMimeType: 'application/json' }
        })
      });
      return { status: r.status, ok: r.ok, body: await r.text() };
    });
    const json: any = JSON.parse(body);
    const parts: Array<{ text?: string }> = json?.candidates?.[0]?.content?.parts || [];
    const content = parts.map(p => p.text || '').join('');
    return JSON.parse(content);
  }

  async generateQuestions(req: QuestionGenerationRequest): Promise<AiGeneratedQuestion[]> {
    const parsed = await this.chatJson([
      { role: 'user', parts: [{ text: `${buildSystemPrompt()}\n\n${buildUserPrompt(req)}` }] }
    ]);
    const list: any[] = Array.isArray(parsed?.questions) ? parsed.questions : [];
    return mapQuestions(req, list);
  }
}

/** OpenAI, pay-per-use (kept as an optional fallback). */
export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';
  get available(): boolean {
    return Boolean(OPENAI_KEY);
  }

  private async chatJson(messages: Array<{ role: string; content: string }>): Promise<any> {
    const { body } = await fetchWithRetry(async () => {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
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
      return { status: r.status, ok: r.ok, body: await r.text() };
    });
    const json: any = JSON.parse(body);
    const content: string = json?.choices?.[0]?.message?.content || '';
    return JSON.parse(content);
  }

  async generateQuestions(req: QuestionGenerationRequest): Promise<AiGeneratedQuestion[]> {
    const parsed = await this.chatJson([
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: buildUserPrompt(req) }
    ]);
    const list: any[] = Array.isArray(parsed?.questions) ? parsed.questions : [];
    return mapQuestions(req, list);
  }
}

/** All configured providers, in priority order (free tier first). */
export function getAIProviders(): AIProvider[] {
  const providers: AIProvider[] = [];
  const gemini = new GeminiProvider();
  if (gemini.available) providers.push(gemini);
  const openai = new OpenAIProvider();
  if (openai.available) providers.push(openai);
  return providers;
}

/** The primary AI provider, or null if none is configured. */
export function getAIProvider(): AIProvider | null {
  return getAIProviders()[0] ?? null;
}
