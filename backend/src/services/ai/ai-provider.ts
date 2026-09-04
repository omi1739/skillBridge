import { AiGeneratedQuestion, QuestionGenerationRequest } from '@skillbridge/types';

/**
 * Provider abstraction for AI question generation. The concrete provider is
 * selected at runtime from configuration; if no provider is configured (no API
 * key), `getAIProvider()` returns null and callers fall back to the bank —
 * AI generation never blocks normal usage.
 *
 * Supported providers:
 *   - gemini (free tier via Google AI Studio, key: GEMINI_API_KEY)
 *   - openai (pay-per-use, key: OPENAI_API_KEY)
 *
 * Selection priority favours the free tier (Gemini) when a key is present, so
 * the MVP can stay at zero cost while still allowing a paid fallback.
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

/** Google Gemini, via the free tier (AI Studio API key). */
export class GeminiProvider implements AIProvider {
  readonly name = 'gemini';
  get available(): boolean {
    return Boolean(GEMINI_KEY);
  }

  private async chatJson(contents: Array<{ role: string; parts: Array<{ text: string }> }>): Promise<any> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(GEMINI_KEY)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: { temperature: 0.7, responseMimeType: 'application/json' }
      })
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Gemini request failed (${res.status}): ${text}`);
    }
    const json: any = await res.json();
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
    const parsed = await this.chatJson([
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: buildUserPrompt(req) }
    ]);
    const list: any[] = Array.isArray(parsed?.questions) ? parsed.questions : [];
    return mapQuestions(req, list);
  }
}

let cachedProvider: AIProvider | null | undefined;

export function getAIProvider(): AIProvider | null {
  if (cachedProvider === undefined) {
    const gemini = new GeminiProvider();
    if (gemini.available) {
      cachedProvider = gemini;
    } else {
      const openai = new OpenAIProvider();
      cachedProvider = openai.available ? openai : null;
    }
  }
  return cachedProvider;
}
