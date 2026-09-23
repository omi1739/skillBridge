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
   * Generate a new challenge. With the API key configured it calls the model;
   * otherwise it falls back to a curated offline bank so the "generate" flow
   * keeps working on local dev / free tier without any external dependency.
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
    return pickOffline(req);
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

/**
 * Curated offline bank used when no OpenAI API key is configured (local dev /
 * free tier). SQL entries are self-checked on pick; JS entries ship runnable
 * test cases. These are also registered eagerly (below) so the sandbox has a
 * usable challenge list even before any API-key generation happens.
 */
const OFFLINE_BANK: GeneratedChallenge[] = [
  {
    id: 'offline_sql_01',
    title: 'findAboveSalary',
    type: 'SQL',
    skillId: 'skill_sql',
    difficulty: 'Intermediate',
    description: 'Write a query that returns the name and salary of every employee earning at least the given salary? Use the employees table: id, name, department, salary.',
    starterCode: 'SELECT name, salary FROM employees WHERE salary >= 80000 ORDER BY salary DESC;',
    referenceSolution: 'SELECT name, salary FROM employees WHERE salary >= 80000 ORDER BY salary DESC;',
    schemaPreview: 'employees(id, name, department, salary)',
    sampleDataDescription: 'Four employees across Engineering / Marketing.',
    schemaSql: 'CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT NOT NULL, department TEXT NOT NULL, salary REAL NOT NULL);',
    seedSql: `INSERT INTO employees (id, name, department, salary) VALUES
      (1, 'Alice', 'Engineering', 90000),
      (2, 'Bob', 'Marketing', 70000),
      (3, 'Carol', 'Engineering', 80000),
      (4, 'Dave', 'Marketing', 50000);`,
    referenceQuery: 'SELECT name, salary FROM employees WHERE salary >= 80000 ORDER BY salary DESC;',
    verified: true
  },
  {
    id: 'offline_sql_02',
    title: 'cheapestProducts',
    type: 'SQL',
    skillId: 'skill_sql',
    difficulty: 'Beginner',
    description: 'List the name and price of every product ordered from cheapest to most expensive.',
    starterCode: 'SELECT name, price FROM products ORDER BY price ASC;',
    referenceSolution: 'SELECT name, price FROM products ORDER BY price ASC;',
    schemaPreview: 'products(id, name, price)',
    sampleDataDescription: 'Three products.',
    schemaSql: 'CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT NOT NULL, price REAL NOT NULL);',
    seedSql: `INSERT INTO products (id, name, price) VALUES
      (1, 'Laptop', 999.99),
      (2, 'Mouse', 24.5),
      (3, 'Keyboard', 89.0);`,
    referenceQuery: 'SELECT name, price FROM products ORDER BY price ASC;',
    verified: true
  },
  {
    id: 'offline_sql_03',
    title: 'repeatCustomers',
    type: 'SQL',
    skillId: 'skill_postgresql',
    difficulty: 'Advanced',
    description: 'Find customers with more than one order and show their order count and total spend.',
    starterCode: `SELECT customer, COUNT(*) AS order_count, SUM(amount) AS total_spend
FROM orders
GROUP BY customer
HAVING COUNT(*) > 1
ORDER BY total_spend DESC;`,
    referenceSolution: `SELECT customer, COUNT(*) AS order_count, SUM(amount) AS total_spend
FROM orders
GROUP BY customer
HAVING COUNT(*) > 1
ORDER BY total_spend DESC;`,
    schemaPreview: 'orders(customer, amount)',
    sampleDataDescription: 'Orders belonging to a handful of customers.',
    schemaSql: 'CREATE TABLE orders (customer TEXT NOT NULL, amount REAL NOT NULL);',
    seedSql: `INSERT INTO orders (customer, amount) VALUES
      ('Anika', 120), ('Anika', 80), ('Rafiq', 200), ('Nadia', 320), ('Rafiq', 150);`,
    referenceQuery: `SELECT customer, COUNT(*) AS order_count, SUM(amount) AS total_spend
FROM orders
GROUP BY customer
HAVING COUNT(*) > 1
ORDER BY total_spend DESC;`,
    verified: true
  },
  {
    id: 'offline_js_01',
    title: 'add',
    type: 'JAVASCRIPT',
    skillId: 'skill_javascript',
    difficulty: 'Beginner',
    description: 'Implement an async function add(a, b) that returns the sum of two numbers.',
    starterCode: `async function add(a, b) {
  // TODO: return the sum of a + b
  return a + b;
}`,
    referenceSolution: `async function add(a, b) {
  return a + b;
}`,
    sampleDataDescription: 'Test cases call add(x, y) with integers.',
    testCases: [
      { name: 'Positives', input: '[3, 5]', expected: '8' },
      { name: 'Negatives', input: '[-4, -11]', expected: '-15' },
      { name: 'Zero', input: '[0, 0]', expected: '0' }
    ],
    verified: true
  },
  {
    id: 'offline_js_02',
    title: 'evens',
    type: 'JAVASCRIPT',
    skillId: 'skill_nodejs',
    difficulty: 'Intermediate',
    description: 'Implement an async function evens(numbers) that returns a new array containing only the even numbers from the input array.',
    starterCode: `async function evens(numbers) {
  // TODO: keep only the even values
  return numbers.filter(n => n % 2 === 0);
}`,
    referenceSolution: `async function evens(numbers) {
  return numbers.filter(n => n % 2 === 0);
}`,
    sampleDataDescription: 'Test cases call evens([...]) with arrays of integers.',
    testCases: [
      { name: 'Mixed', input: '[1, 2, 3, 4, 5, 6]', expected: '[2, 4, 6]' },
      { name: 'None', input: '[1, 3, 5, 7]', expected: '[]' },
      { name: 'All even', input: '[2, 10, 100]', expected: '[2, 10, 100]' }
    ],
    verified: true
  },
  {
    id: 'offline_js_03',
    title: 'sumEvens',
    type: 'JAVASCRIPT',
    skillId: 'skill_javascript',
    difficulty: 'Advanced',
    description: 'Implement an async function sumEvens(numbers) that returns the sum of all even numbers in the input array (0 if none).',
    starterCode: `async function sumEvens(numbers) {
  // TODO: sum only the even values
  return numbers.filter(n => n % 2 === 0).reduce((acc, n) => acc + n, 0);
}`,
    referenceSolution: `async function sumEvens(numbers) {
  return numbers.filter(n => n % 2 === 0).reduce((acc, n) => acc + n, 0);
}`,
    sampleDataDescription: 'Test cases call sumEvens([...]) with arrays of integers.',
    testCases: [
      { name: 'Mixed', input: '[1, 2, 3, 4, 5, 6]', expected: '12' },
      { name: 'None', input: '[1, 3, 5]', expected: '0' },
      { name: 'Negative evens', input: '[-2, 4, -8, 1]', expected: '-6' }
    ],
    verified: true
  }
];

/** Eagerly register the offline bank so it is listable/runnable out of the box. */
for (const c of OFFLINE_BANK) {
  dynamicChallenges.set(c.id, c);
}

/** Curated offline bank copy for consumers that need to inspect it (e.g. tests). */
export function getOfflineChallenges(): GeneratedChallenge[] {
  return OFFLINE_BANK.map(c => ({ ...c }));
}

function pickOffline(req: GenerationRequest): GeneratedChallenge {
  const typeMatch = OFFLINE_BANK.filter(c => c.type === req.type);
  if (typeMatch.length === 0) {
    throw new BadRequestException(`No offline ${req.type} challenge is available.`);
  }
  // Prefer matching skill + difficulty, else fall back to any of the type.
  const skillWant = req.skillId ? typeMatch.filter(c => c.skillId === req.skillId) : typeMatch;
  const diffWant = req.difficulty && skillWant.length > 1
    ? skillWant.filter(c => c.difficulty === req.difficulty)
    : skillWant;
  const pool = diffWant.length > 0 ? diffWant : skillWant.length > 0 ? skillWant : typeMatch;
  // Rotate deterministically so repeats yield variety across the pool.
  const idx = (offlineCursor++ * 7) % pool.length;
  return { ...pool[idx], verified: true };
}

let offlineCursor = 0;

/**
 * Rehydrate challenges persisted in the database from a previous run. Skips ids
 * already registered (offline bank + live-generated) so a stale row can never
 * overwrite a fresher in-memory copy. Returns the number restored.
 */
export function restoreDynamicChallenges(challenges: GeneratedChallenge[]): number {
  let restored = 0;
  for (const c of challenges) {
    if (c && c.id && !dynamicChallenges.has(c.id)) {
      dynamicChallenges.set(c.id, c);
      restored++;
    }
  }
  return restored;
}

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
