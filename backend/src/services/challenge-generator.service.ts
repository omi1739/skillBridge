import { BadRequestException } from '@nestjs/common';
import initSqlJs, { SqlJsStatic } from 'sql.js';

let sqlJsPromise: Promise<SqlJsStatic> | null = null;
async function getSqlJsCached(): Promise<SqlJsStatic> {
  if (!sqlJsPromise) sqlJsPromise = initSqlJs();
  return sqlJsPromise;
}

/**
 * OpenAI-compatible challenge generator for the SQL & Code sandbox.
 *
 * When OPENAI_API_KEY is configured, a new challenge is produced on demand via
 * a JSON-only chat completion. To keep grading reliable:
 *   - SQL challenges are re-validated by actually running the generated seed +
 *     reference query through in-memory SQLite before being accepted.
 *   - JS challenges must include runnable test cases and a reference solution.
 *
 * When no API key is present (local dev / free tier), a curated offline bank is
 * used so the "generate" feature still works without any external dependency.
 */

export interface GeneratedChallenge {
  id: string;
  title: string;
  type: 'SQL' | 'JAVASCRIPT';
  skillId: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  starterCode: string;
  referenceSolution: string;
  schemaPreview?: string;
  sampleDataDescription?: string;
  // SQL
  schemaSql?: string;
  seedSql?: string;
  referenceQuery?: string;
  // JS: runnable test cases
  testCases?: Array<{
    name: string;
    input: string; // JSON-encoded args
    expected: string; // JSON-encoded expected result
    code?: string; // optional runner code injected for concurrency-style checks
  }>;
  // Cached success / verification state to avoid re-running the model for the
  // same freshly generated challenge.
  verified?: boolean;
}

export interface GenerationRequest {
  type: 'SQL' | 'JAVASCRIPT';
  skillId?: string;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
}

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class ChallengeGeneratorService {
  private get apiKey(): string {
    return process.env.OPENAI_API_KEY || '';
  }

  get hasApiKey(): boolean {
    return this.apiKey.length > 0;
  }

  /**
   * Generate a new challenge. When the API key is present it calls the model;
   * otherwise no challenge can be produced (the offline bank has been removed).
   */
  async generate(req: GenerationRequest): Promise<GeneratedChallenge> {
    if (!req || !req.type) {
      throw new BadRequestException('type (SQL|JAVASCRIPT) is required');
    }
    if (this.hasApiKey) {
      const generated = await this.generateWithModel(req);
      // Validate generated SQL by executing the reference query against the seed.
      if (generated.type === 'SQL' && !(await this.sqlSelfCheck(generated))) {
        throw new BadRequestException('Generated SQL challenge failed self-validation. Try again.');
      }
      return generated;
    }
    throw new BadRequestException('Challenge generation is unavailable without an API key.');
  }

  async getReferenceSolution(id: string): Promise<{ referenceSolution: string } | null> {
    const dyn = dynamicChallenges.get(id);
    if (dyn) return { referenceSolution: dyn.referenceSolution };
    return null;
  }

  private async generateWithModel(req: GenerationRequest): Promise<GeneratedChallenge> {
    const systemPrompt = `You are a senior backend engineering interviewer. Generate exactly one new, self-contained coding challenge as strict JSON with no markdown fences and no trailing text.
Return JSON with these keys:
- id: a unique slug like "gen_sql_<n>" or "gen_js_<n>"
- title
- type: "${req.type}"
- skillId: a skill id from this set: skill_javascript, skill_nodejs, skill_sql, skill_postgresql, skill_rest_api, skill_git, skill_docker, skill_redis
- difficulty: "Beginner" | "Intermediate" | "Advanced"
- description
- starterCode
- referenceSolution: a clear, correct, complete reference answer (the solution the learner should see)
- For ${req.type === 'SQL' ? 'SQL' : 'JavaScript'} challenges include:
  ${req.type === 'SQL'
    ? `schemaPreview, sampleDataDescription, schemaSql (CREATE TABLE statements), seedSql (INSERT statements), and referenceQuery (the exact SQL the correct answer must produce).`
    : `testCases as an array of {name, input (JSON string of args array), expected (JSON string of expected result)} and starterCode.`}`;

    const userPrompt = `Create a ${req.difficulty || 'Intermediate'} ${req.type} challenge${req.skillId ? ` for skill ${req.skillId}` : ''}. Make it realistic and distinct from common examples.`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: MODEL,
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
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error('Model did not return valid JSON');
    }

    const challenge: GeneratedChallenge = {
      id: parsed.id || this.nextId(req.type),
      title: String(parsed.title || `${req.type} Challenge`),
      type: req.type as 'SQL' | 'JAVASCRIPT',
      skillId: String(parsed.skillId || (req.type === 'SQL' ? 'skill_sql' : 'skill_javascript')),
      difficulty: (parsed.difficulty as any) || 'Intermediate',
      description: String(parsed.description || ''),
      starterCode: String(parsed.starterCode || ''),
      referenceSolution: String(parsed.referenceSolution || ''),
      schemaPreview: parsed.schemaPreview,
      sampleDataDescription: parsed.sampleDataDescription,
      schemaSql: parsed.schemaSql,
      seedSql: parsed.seedSql,
      referenceQuery: parsed.referenceQuery,
      testCases: Array.isArray(parsed.testCases) ? parsed.testCases : undefined,
      verified: false
    };
    return challenge;
  }

  private nextId(type: 'SQL' | 'JAVASCRIPT'): string {
    return `gen_${type.toLowerCase()}_${Date.now()}`;
  }

  /** Execute the generated SQL seed + reference query to confirm they are valid. */
  async sqlSelfCheck(c: GeneratedChallenge): Promise<boolean> {
    try {
      const SQL = await getSqlJsCached();
      const db = new SQL.Database();
      db.run(c.schemaSql || '');
      db.run(c.seedSql || '');
      db.exec(c.referenceQuery || '');
      db.close();
      return true;
    } catch {
      return false;
    }
  }
}

/** In-memory registry for challenges generated on the fly during a run. */
const dynamicChallenges = new Map<string, GeneratedChallenge>();

export function registerDynamicChallenge(c: GeneratedChallenge): string {
  dynamicChallenges.set(c.id, c);
  return c.id;
}

export function getDynamicChallenges(): GeneratedChallenge[] {
  return Array.from(dynamicChallenges.values());
}

export function getDynamicChallenge(id: string): GeneratedChallenge | undefined {
  return dynamicChallenges.get(id);
}

export const challengeGenerator = new ChallengeGeneratorService();
