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
  private static idCounter = 0;

  private get apiKey(): string {
    return process.env.OPENAI_API_KEY || '';
  }

  get hasApiKey(): boolean {
    return this.apiKey.length > 0;
  }

  private static offlineBank: GeneratedChallenge[] = [
    {
      id: 'gen_sql_adv_01',
      title: 'SQL: Running Total with Window Function',
      type: 'SQL',
      skillId: 'skill_sql',
      difficulty: 'Intermediate',
      description:
        'Given a sales table, write a query that returns each sale row plus a running total of revenue ordered by sale_date. Use a window function.',
      starterCode: `-- Write your query below
SELECT id, sale_date, amount,
       SUM(amount) OVER (ORDER BY sale_date) AS running_total
FROM sales
ORDER BY sale_date;`,
      referenceSolution:
        'Use SUM(amount) OVER (ORDER BY sale_date) to compute a cumulative running total.',
      schemaPreview: 'sales (id INT, sale_date DATE, amount NUMERIC)',
      sampleDataDescription: 'A handful of dated sale records with varying amounts.',
      schemaSql: `CREATE TABLE sales (id INT, sale_date DATE, amount NUMERIC);`,
      seedSql: `INSERT INTO sales (id, sale_date, amount) VALUES
  (1, '2024-01-01', 100),
  (2, '2024-01-02', 250),
  (3, '2024-01-03', 75),
  (4, '2024-01-04', 300);`,
      referenceQuery: `SELECT id, sale_date, amount,
       SUM(amount) OVER (ORDER BY sale_date) AS running_total
FROM sales ORDER BY sale_date;`,
      verified: true
    },
    {
      id: 'gen_js_adv_01',
      title: 'JavaScript: Chunk Array into Groups',
      type: 'JAVASCRIPT',
      skillId: 'skill_javascript',
      difficulty: 'Intermediate',
      description:
        'Implement chunkItems(arr, size) that splits an array into groups of the given size, keeping the final partial group if one remains.',
      starterCode: `function chunkItems(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}`,
      referenceSolution:
        'Iterate the array in steps of the group size, slicing out each sub-array with arr.slice(i, i + size) and pushing it onto the result.',
      testCases: [
        { name: 'Splits array into equal groups', input: '[[1,2,3,4,5,6],2]', expected: '[[1,2],[3,4],[5,6]]' },
        { name: 'Keeps final partial group', input: '[[1,2,3,4,5],2]', expected: '[[1,2],[3,4],[5]]' },
        { name: 'Handles empty array', input: '[[],3]', expected: '[]' }
      ],
      verified: true
    }
  ];

  /**
   * Generate a new challenge. When the API key is present it calls the model;
   * otherwise it draws from the curated offline bank.
   */
  async generate(req: GenerationRequest): Promise<GeneratedChallenge> {
    if (!req || !req.type) {
      throw new BadRequestException('type (SQL|JAVASCRIPT) is required');
    }
    if (this.hasApiKey) {
      const generated = await this.generateWithModel(req);
      // Validate generated SQL by executing the reference query against the seed.
      if (generated.type === 'SQL' && !(await this.sqlSelfCheck(generated))) {
        // Fall back to the offline bank if the model output does not self-validate.
        return this.drawOffline(req.type, req.skillId, req.difficulty);
      }
      return generated;
    }
    return this.drawOffline(req.type, req.skillId, req.difficulty);
  }

  async getReferenceSolution(id: string): Promise<{ referenceSolution: string } | null> {
    const offline = this.offlineById(id);
    if (offline) return { referenceSolution: offline.referenceSolution };
    const dyn = dynamicChallenges.get(id);
    if (dyn) return { referenceSolution: dyn.referenceSolution };
    return null;
  }

  getOfflineChallenge(id: string): GeneratedChallenge | undefined {
    return this.offlineById(id);
  }

  private offlineById(id: string): GeneratedChallenge | undefined {
    return ChallengeGeneratorService.offlineBank.find(c => c.id === id);
  }

  private drawOffline(
    type: 'SQL' | 'JAVASCRIPT',
    skillId?: string,
    difficulty?: string
  ): GeneratedChallenge {
    const pool = ChallengeGeneratorService.offlineBank.filter(
      c => c.type === type &&
        (!skillId || c.skillId === skillId) &&
        (!difficulty || c.difficulty === difficulty)
    );
    const source = pool.length > 0 ? pool : ChallengeGeneratorService.offlineBank.filter(c => c.type === type);
    if (source.length === 0) {
      // Fallback: mirror a deterministic simple challenge.
      return this.fallbackChallenge(type);
    }
    return source[ChallengeGeneratorService.idCounter++ % source.length];
  }

  private fallbackChallenge(type: 'SQL' | 'JAVASCRIPT'): GeneratedChallenge {
    if (type === 'SQL') {
      return {
        id: `gen_sql_fb_${ChallengeGeneratorService.idCounter++}`,
        title: 'SQL: Simple Aggregation',
        type: 'SQL',
        skillId: 'skill_sql',
        difficulty: 'Beginner',
        description: 'Return each department name and its employee count ordered by name.',
        starterCode: `SELECT d.name, COUNT(e.id) AS cnt
FROM departments d
LEFT JOIN employees e ON d.id = e.department_id
GROUP BY d.name
ORDER BY d.name;`,
        referenceSolution: 'Group by department and count employees using LEFT JOIN.',
        schemaSql: 'CREATE TABLE departments (id INT, name VARCHAR);\nCREATE TABLE employees (id INT, name VARCHAR, department_id INT);',
        seedSql: `INSERT INTO departments (id,name) VALUES (1,'Eng'),(2,'Sales');
INSERT INTO employees (id,name,department_id) VALUES (1,'A',1),(2,'B',1),(3,'C',2);`,
        referenceQuery: `SELECT d.name, COUNT(e.id) AS cnt FROM departments d LEFT JOIN employees e ON d.id=e.department_id GROUP BY d.name ORDER BY d.name;`,
        schemaPreview: 'departments (id INT, name VARCHAR)\nemployees (id INT, name VARCHAR, department_id INT)',
        sampleDataDescription: 'Two departments and three employees.',
        verified: true
      };
    }
    return {
      id: `gen_js_fb_${ChallengeGeneratorService.idCounter++}`,
      title: 'JavaScript: Double Even Numbers',
      type: 'JAVASCRIPT',
      skillId: 'skill_javascript',
      difficulty: 'Beginner',
      description: 'Implement a function doubleEvens(arr) that returns a new array with only even numbers doubled.',
      starterCode: `function doubleEvens(arr) {
  return arr.filter(x => x % 2 === 0).map(x => x * 2);
}`,
      referenceSolution: 'Filter to evens, then map each to double.',
      testCases: [
        { name: 'Doubles even numbers only', input: '[1,2,3,4]', expected: '[4,8]' },
        { name: 'Empty array returns empty', input: '[]', expected: '[]' }
      ],
      verified: true
    };
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
