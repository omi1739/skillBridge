import { QuestionGenerationRequest } from '@skillbridge/types';

/**
 * Verifies the Gemini provider's model-fallback behavior. Free-tier models are
 * frequently overloaded (503) or retired (404); the provider must transparently
 * fall through to the next configured model rather than returning the error.
 */

const originalFetch = global.fetch;
const originalEnv = process.env;

function loadProvider(env: Record<string, string>): typeof import('./ai-provider') {
  process.env = { ...originalEnv, ...env };
  let mod!: typeof import('./ai-provider');
  jest.isolateModules(() => {
    mod = require('./ai-provider');
  });
  return mod;
}

function mockFetchResponder(responses: Array<{ status: number; body: string }>) {
  let call = 0;
  global.fetch = jest.fn(async () => {
    const r = responses[Math.min(call++, responses.length - 1)];
    return { status: r.status, ok: r.status >= 200 && r.status < 300, text: async () => r.body } as any;
  }) as any;
  return global.fetch as jest.Mock;
}

function questionBody(): string {
  return JSON.stringify({
    candidates: [
      {
        content: {
          parts: [
            {
              text: JSON.stringify({
                questions: [
                  { questionText: 'What is OOP?', questionType: 'MCQ', options: ['A', 'B'], correctAnswer: 'A' }
                ]
              })
            }
          ]
        }
      }
    ]
  });
}

const REQ: QuestionGenerationRequest = {
  skillId: 'skill_java',
  topic: 'oop',
  difficulty: 'medium',
  questionType: 'MCQ',
  count: 1
};

describe('GeminiProvider model fallback', () => {
  afterEach(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
    jest.resetModules();
  });

  it('falls through from an overloaded primary (503) to the next model', async () => {
    const { GeminiProvider } = loadProvider({
      GEMINI_API_KEY: 'test-key',
      GEMINI_MODEL: 'model-primary',
      GEMINI_FALLBACK_MODELS: 'model-secondary',
      GEMINI_REQUEST_TIMEOUT_MS: '5000'
    });
    const fetchMock = mockFetchResponder([
      { status: 503, body: '{"error":{"code":503,"message":"high demand"}}' },
      { status: 503, body: '{"error":{"code":503,"message":"high demand"}}' },
      { status: 200, body: questionBody() }
    ]);

    const questions = await new GeminiProvider().generateQuestions(REQ);

    expect(questions).toHaveLength(1);
    const urls = fetchMock.mock.calls.map(c => String(c[0]));
    expect(urls.some(u => u.includes('model-primary'))).toBe(true);
    expect(urls[urls.length - 1]).toContain('model-secondary');
  });

  it('moves to the next model on a non-retryable 404 (retired model)', async () => {
    const { GeminiProvider } = loadProvider({
      GEMINI_API_KEY: 'test-key',
      GEMINI_MODEL: 'model-gone',
      GEMINI_FALLBACK_MODELS: 'model-alive',
      GEMINI_REQUEST_TIMEOUT_MS: '5000'
    });
    const fetchMock = mockFetchResponder([
      { status: 404, body: '{"error":{"code":404,"message":"no longer available"}}' },
      { status: 200, body: questionBody() }
    ]);

    const questions = await new GeminiProvider().generateQuestions(REQ);

    expect(questions).toHaveLength(1);
    const urls = fetchMock.mock.calls.map(c => String(c[0]));
    expect(urls[0]).toContain('model-gone');
    expect(urls[urls.length - 1]).toContain('model-alive');
  });

  it('throws a clear aggregate error when every model fails', async () => {
    const { GeminiProvider } = loadProvider({
      GEMINI_API_KEY: 'test-key',
      GEMINI_MODEL: 'model-a',
      GEMINI_FALLBACK_MODELS: 'model-b',
      GEMINI_REQUEST_TIMEOUT_MS: '5000'
    });
    mockFetchResponder([{ status: 503, body: '{"error":{"code":503}}' }]);

    await expect(new GeminiProvider().generateQuestions(REQ)).rejects.toThrow(/model-a.*model-b/s);
  });
});
