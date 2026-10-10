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
 *
 * Gemini is additionally resilient to model-scoped outages: individual models
 * are frequently overloaded (HTTP 503) or retired (HTTP 404), and a request to
 * an overloaded model can hang for minutes. Every request therefore runs under
 * a hard timeout and, on failure, falls through to the next configured Gemini
 * model before giving up.
 */
export interface AIProvider {
  readonly name: string;
  available: boolean;
  generateQuestions(req: QuestionGenerationRequest): Promise<AiGeneratedQuestion[]>;
  /** Generic JSON completion for non-question use cases (e.g. project health). */
  generateJSON<T = any>(systemPrompt: string, userPrompt: string): Promise<T>;
}

const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
/** Ordered fallbacks tried when the primary model is overloaded or retired. */
const GEMINI_FALLBACK_MODELS = (process.env.GEMINI_FALLBACK_MODELS || 'gemini-3.5-flash,gemini-3.5-flash-lite,gemini-3.8-flash')
  .split(',')
  .map(m => m.trim())
  .filter(Boolean);
const GEMINI_REQUEST_TIMEOUT_MS = Number(process.env.GEMINI_REQUEST_TIMEOUT_MS || 25000);
/** Hard ceiling across all Gemini model attempts so a request can never hang. */
const GEMINI_TOTAL_BUDGET_MS = Number(process.env.GEMINI_TOTAL_BUDGET_MS || 60000);
const OPENAI_KEY = process.env.OPENAI_API_KEY || '';
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const OPENAI_REQUEST_TIMEOUT_MS = Number(process.env.OPENAI_REQUEST_TIMEOUT_MS || 30000);

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

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Abort the underlying request if it outlives the deadline. */
function withTimeout(ms: number): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1000, ms));
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

interface FetchResult {
  status: number;
  ok: boolean;
  body: string;
}

/**
 * Run an async fetch wrapper under a hard timeout, retrying transient failures
 * (429/5xx and network errors) with exponential backoff. Returns the status +
 * body of the response, or throws the last error once all attempts are spent.
 * A timeout is retried at most once and is reported as a distinct error so the
 * caller can fall through to another model instead of stalling.
 */
async function fetchWithRetry(
  doFetch: (signal: AbortSignal) => Promise<FetchResult>,
  opts: { timeoutMs: number; attempts?: number }
): Promise<FetchResult> {
  const maxAttempts = Math.max(1, opts.attempts ?? RETRYABLE_DELAYS_MS.length + 1);
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let status = 0;
    const { signal, clear } = withTimeout(opts.timeoutMs);
    try {
      const res = await doFetch(signal);
      status = res.status;
      if (res.ok) return res;
      lastError = new Error(`HTTP ${res.status}: ${res.body.slice(0, 400)}`);
    } catch (err: any) {
      lastError =
        err?.name === 'AbortError'
          ? new Error(`request timed out after ${opts.timeoutMs}ms`)
          : err instanceof Error
            ? err
            : new Error(String(err));
    } finally {
      clear();
    }
    // Non-transient HTTP status -> fail fast without more retries.
    if (status && !isRetryableStatus(status)) {
      throw lastError;
    }
    if (attempt < maxAttempts - 1) {
      await sleep(RETRYABLE_DELAYS_MS[Math.min(attempt, RETRYABLE_DELAYS_MS.length - 1)]);
    }
  }
  throw lastError || new Error('Retry exhausted');
}

/** Ordered, de-duplicated list of Gemini models to try. */
function geminiModels(): string[] {
  return Array.from(new Set([GEMINI_MODEL, ...GEMINI_FALLBACK_MODELS]));
}

/** Google Gemini, via the free tier (AI Studio API key). */
export class GeminiProvider implements AIProvider {
  readonly name = 'gemini';
  get available(): boolean {
    return Boolean(GEMINI_KEY);
  }

  private async generateOnModel(
    model: string,
    contents: Array<{ role: string; parts: Array<{ text: string }> }>
  ): Promise<any> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(GEMINI_KEY)}`;
    const { body } = await fetchWithRetry(
      async signal => {
        const r = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal,
          body: JSON.stringify({
            contents,
            generationConfig: { temperature: 0.7, responseMimeType: 'application/json' }
          })
        });
        return { status: r.status, ok: r.ok, body: await r.text() };
      },
      { timeoutMs: GEMINI_REQUEST_TIMEOUT_MS, attempts: 2 }
    );
    const json: any = JSON.parse(body);
    const parts: Array<{ text?: string }> = json?.candidates?.[0]?.content?.parts || [];
    const content = parts.map(p => p.text || '').join('');
    return JSON.parse(content);
  }

  private async chatJson(contents: Array<{ role: string; parts: Array<{ text: string }> }>): Promise<any> {
    const models = geminiModels();
    const deadline = Date.now() + GEMINI_TOTAL_BUDGET_MS;
    const errors: string[] = [];
    for (const model of models) {
      if (Date.now() >= deadline) {
        errors.push('overall time budget exceeded before trying remaining models');
        break;
      }
      try {
        return await this.generateOnModel(model, contents);
      } catch (err: any) {
        errors.push(`${model}: ${err?.message || err}`);
      }
    }
    throw new Error(`Gemini generation failed (${errors.join(' | ')})`);
  }

  async generateQuestions(req: QuestionGenerationRequest): Promise<AiGeneratedQuestion[]> {
    const parsed = await this.chatJson([
      { role: 'user', parts: [{ text: `${buildSystemPrompt()}\n\n${buildUserPrompt(req)}` }] }
    ]);
    const list: any[] = Array.isArray(parsed?.questions) ? parsed.questions : [];
    return mapQuestions(req, list);
  }

  async generateJSON<T = any>(systemPrompt: string, userPrompt: string): Promise<T> {
    return this.chatJson([
      { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
    ]) as Promise<T>;
  }
}

/** OpenAI, pay-per-use (kept as an optional fallback). */
export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';
  get available(): boolean {
    return Boolean(OPENAI_KEY);
  }

  private async chatJson(messages: Array<{ role: string; content: string }>): Promise<any> {
    const { body } = await fetchWithRetry(
      async signal => {
        const r = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${OPENAI_KEY}`
          },
          signal,
          body: JSON.stringify({
            model: DEFAULT_MODEL,
            messages,
            temperature: 0.7,
            response_format: { type: 'json_object' }
          })
        });
        return { status: r.status, ok: r.ok, body: await r.text() };
      },
      { timeoutMs: OPENAI_REQUEST_TIMEOUT_MS }
    );
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

  async generateJSON<T = any>(systemPrompt: string, userPrompt: string): Promise<T> {
    return this.chatJson([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]) as Promise<T>;
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

/**
 * Run a generic JSON completion against the first provider that succeeds.
 * Returns `null` (never throws) when no provider is configured or every
 * provider fails, so callers can always fall back to deterministic logic.
 */
export async function generateAIJson<T = any>(
  systemPrompt: string,
  userPrompt: string
): Promise<{ data: T; model: string } | null> {
  const providers = getAIProviders();
  if (providers.length === 0) return null;
  for (const provider of providers) {
    try {
      const data = await provider.generateJSON<T>(systemPrompt, userPrompt);
      if (data) return { data, model: provider.name };
    } catch (err: any) {
      console.warn(`[ai] ${provider.name} JSON generation failed: ${err?.message || err}`);
    }
  }
  return null;
}
