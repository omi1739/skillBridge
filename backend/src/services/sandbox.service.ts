import { SkillEvidence } from '@skillbridge/types';
import * as vm from 'vm';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { store } from '../store';
import { gapService } from './gap.service';
import {
  GeneratedChallenge,
  challengeGenerator,
  getDynamicChallenges,
  getDynamicChallenge
} from './challenge-generator.service';

export interface SandboxChallenge {
  id: string;
  title: string;
  type: 'SQL' | 'JAVASCRIPT';
  skillId: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  starterCode: string;
  schemaPreview?: string;
  sampleDataDescription?: string;
  testCasesCount: number;
}

export interface SQLRow {
  [key: string]: any;
}

export interface ExecutionResult {
  passed: boolean;
  message: string;
  executionTimeMs: number;
  outputRows?: SQLRow[];
  testResults?: Array<{ testName: string; passed: boolean; expected: any; actual: any }>;
  verifiedEvidence?: SkillEvidence;
}

interface SqlFixture {
  skillId: string;
  proficiency: number;
  schemaSql: string;
  seedSql: string;
  referenceQuery: string;
}

const SQL_FIXTURES: Record<string, SqlFixture> = {
  challenge_sql_01: {
    skillId: 'skill_sql',
    proficiency: 0.95,
    schemaSql: `CREATE TABLE departments (id INT, name VARCHAR);
CREATE TABLE employees (id INT, name VARCHAR, department_id INT, salary NUMERIC);`,
    seedSql: `INSERT INTO departments (id, name) VALUES
  (1, 'Engineering'), (2, 'Marketing'), (3, 'Sales'), (4, 'Support');
INSERT INTO employees (id, name, department_id, salary) VALUES
  (1, 'Alice', 1, 80000), (2, 'Bob', 1, 90000),
  (3, 'Charlie', 1, 85000), (4, 'Diana', 1, 95000),
  (5, 'Eve', 2, 65000), (6, 'Frank', 2, 65000),
  (7, 'Grace', 3, 70000), (8, 'Heidi', 4, 50000);`,
    referenceQuery: `SELECT d.name AS department_name, COUNT(e.id) AS employee_count, AVG(e.salary) AS avg_salary
FROM departments d
JOIN employees e ON d.id = e.department_id
GROUP BY d.name
HAVING COUNT(e.id) > 1 AND AVG(e.salary) > 60000
ORDER BY avg_salary DESC;`
  },
  challenge_sql_02: {
    skillId: 'skill_postgresql',
    proficiency: 0.90,
    schemaSql: `CREATE TABLE customers (id INT, name VARCHAR, email VARCHAR);
CREATE TABLE orders (id INT, customer_id INT, order_date DATE, total NUMERIC);`,
    seedSql: `INSERT INTO customers (id, name, email) VALUES
  (1, 'Nafis Ahmed', 'nafis@example.com'),
  (2, 'Tanvir Hossain', 'tanvir@example.com'),
  (3, 'Rahim Uddin', 'rahim@example.com'),
  (4, 'Sadia Rahman', 'sadia@example.com');
INSERT INTO orders (id, customer_id, order_date, total) VALUES
  (1, 3, '2024-01-10', 150.00),
  (2, 4, '2024-02-15', 320.50),
  (3, 3, '2024-03-01', 85.00);`,
    referenceQuery: `SELECT c.name, c.email
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
WHERE o.id IS NULL
ORDER BY c.name ASC;`
  }
};

export class SandboxService {
  // Predefined Hands-On Challenges
  private challenges: SandboxChallenge[] = [
    {
      id: 'challenge_sql_01',
      title: 'SQL: High-Earning Departments Aggregation',
      type: 'SQL',
      skillId: 'skill_sql',
      difficulty: 'Intermediate',
      description: 'Write a query to find the department name, number of employees, and average salary for all departments with more than 1 employee and average salary > 60,000. Order by average salary descending.',
      schemaPreview: `departments (id INT, name VARCHAR)
employees (id INT, name VARCHAR, department_id INT, salary NUMERIC)`,
      sampleDataDescription: 'Preloaded with 4 departments and 8 employee records across Engineering, Marketing, Sales, and Support.',
      starterCode: `-- Write your SQL query below
SELECT d.name AS department_name, COUNT(e.id) AS employee_count, AVG(e.salary) AS avg_salary
FROM departments d
JOIN employees e ON d.id = e.department_id
GROUP BY d.name
HAVING COUNT(e.id) > 1 AND AVG(e.salary) > 60000
ORDER BY avg_salary DESC;`,
      testCasesCount: 2
    },
    {
      id: 'challenge_sql_02',
      title: 'SQL: Find Inactive Customers (Anti-Join)',
      type: 'SQL',
      skillId: 'skill_postgresql',
      difficulty: 'Beginner',
      description: 'Write a query to list all customer names and emails who have NEVER placed an order. Use a LEFT JOIN or NOT EXISTS.',
      schemaPreview: `customers (id INT, name VARCHAR, email VARCHAR)
orders (id INT, customer_id INT, order_date DATE, total NUMERIC)`,
      starterCode: `-- Find customers with zero orders
SELECT c.name, c.email
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
WHERE o.id IS NULL
ORDER BY c.name ASC;`,
      testCasesCount: 2
    },
    {
      id: 'challenge_js_01',
      title: 'JavaScript: Async Batch Execution Worker',
      type: 'JAVASCRIPT',
      skillId: 'skill_javascript',
      difficulty: 'Intermediate',
      description: 'Implement a batch processor `batchMap(items, batchSize, fn)` that processes an array of items through an async function `fn` with a maximum concurrency of `batchSize` at any given time, returning all results in original order.',
      starterCode: `async function batchMap(items, batchSize, fn) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize);
    const chunkResults = await Promise.all(chunk.map(item => fn(item)));
    results.push(...chunkResults);
  }
  return results;
}`,
      testCasesCount: 3
    }
  ];

  public getChallenges(): SandboxChallenge[] {
    const dynamic: SandboxChallenge[] = getDynamicChallenges().map(toSandboxChallenge);
    return [...dynamic, ...this.challenges];
  }

  /**
   * Real in-memory SQL evaluation via SQLite (sql.js/WASM) against per-challenge
   * test data. The user's query runs against the same seeded dataset as a canonical
   * reference query, and the ordered result sets are compared for an exact match.
   */
  public async executeSQL(challengeId: string, query: string, userId: string = 'demo_user_01'): Promise<ExecutionResult> {
    const startTime = Date.now();
    let fixture = SQL_FIXTURES[challengeId];
    let dynSql: GeneratedChallenge | undefined;

    if (!fixture) {
      dynSql = getDynamicChallenge(challengeId);
      if (dynSql && dynSql.schemaSql && dynSql.seedSql && dynSql.referenceQuery) {
        fixture = {
          skillId: dynSql.skillId || 'skill_sql',
          proficiency: 0.9,
          schemaSql: dynSql.schemaSql,
          seedSql: dynSql.seedSql,
          referenceQuery: dynSql.referenceQuery
        };
      }
    }

    if (!fixture) {
      return {
        passed: false,
        message: 'Unknown challenge ID.',
        executionTimeMs: Date.now() - startTime
      };
    }

    const cleanQuery = query.trim().toUpperCase();
    if (cleanQuery.includes('DROP ') || cleanQuery.includes('DELETE ') || cleanQuery.includes('TRUNCATE ') || cleanQuery.includes('ALTER ')) {
      return {
        passed: false,
        message: 'Destructive DDL/DML operations are disabled in this test sandbox.',
        executionTimeMs: Date.now() - startTime
      };
    }

    try {
      const db = await runInMemoryDb(fixture.schemaSql, fixture.seedSql);
      const expected = normalizeRows(mapResult(db, fixture.referenceQuery));
      const actual = normalizeRows(mapResult(db, query));
      db.close();

      if (rowsMatch(expected, actual)) {
        const verifiedEvidence = await this.recordVerifiedEvidence(userId, fixture.skillId, fixture.proficiency);
        return {
          passed: true,
          message: `All test cases passed! Result table (${actual.length} row(s)) matches the expected dataset perfectly.`,
          executionTimeMs: Date.now() - startTime,
          outputRows: actual,
          verifiedEvidence
        };
      }

      return {
        passed: false,
        message: `Result set did not match the expected output. Expected ${expected.length} row(s), got ${actual.length}.`,
        executionTimeMs: Date.now() - startTime,
        outputRows: actual,
        testResults: [
          {
            testName: 'Result set equality (rows and ordering)',
            passed: false,
            expected,
            actual
          }
        ]
      };
    } catch (err: any) {
      return {
        passed: false,
        message: `SQL Error: ${err.message}`,
        executionTimeMs: Date.now() - startTime
      };
    }
  }

  /**
   * Deterministic JS challenge evaluation with VM isolation and a hard time limit
   * so user code cannot touch Node globals (require/process) or run forever.
   */
  public async executeJavaScript(challengeId: string, userCode: string, userId: string = 'demo_user_01'): Promise<ExecutionResult> {
    const startTime = Date.now();
    const timeoutMs = 5000;

    try {
      const dyn = getDynamicChallenge(challengeId) || challengeGenerator.getOfflineChallenge(challengeId);
      if (dyn && dyn.type === 'JAVASCRIPT' && dyn.testCases && dyn.testCases.length > 0) {
        return await this.runDynamicJs(dyn, userCode, userId, startTime, timeoutMs);
      }

      if (challengeId === 'challenge_js_01') {
        const userFunction = this.runUserFunction(userCode, timeoutMs);
        if (typeof userFunction !== 'function') {
          return {
            passed: false,
            message: 'Provided code does not define a `batchMap` function.',
            executionTimeMs: Date.now() - startTime
          };
        }

        // Run Test Case 1: Simple array doubling preserving order
        const items1 = [1, 2, 3, 4, 5];
        const res1 = await withTimeout(userFunction(items1, 2, async (x: number) => x * 2), timeoutMs);
        const expected1 = [2, 4, 6, 8, 10];
        const pass1 = JSON.stringify(res1) === JSON.stringify(expected1);

        // Run Test Case 2: Concurrency check
        let activeConcurrent = 0;
        let maxConcurrentObserved = 0;
        const items2 = [10, 20, 30, 40, 50, 60];
        const res2: any = await withTimeout(
          userFunction(items2, 2, async (x: number) => {
            activeConcurrent++;
            maxConcurrentObserved = Math.max(maxConcurrentObserved, activeConcurrent);
            await new Promise(r => setTimeout(r, 10));
            activeConcurrent--;
            return x + 1;
          }),
          timeoutMs
        );
        const pass2 = maxConcurrentObserved <= 2 && res2.length === 6;

        const allPassed = pass1 && pass2;
        const testResults = [
          { testName: 'Preserves item order and return values', passed: pass1, expected: expected1, actual: res1 },
          { testName: 'Enforces maximum concurrency limit <= 2', passed: pass2, expected: 'max 2 concurrent', actual: `${maxConcurrentObserved} concurrent` }
        ];

        let verifiedEvidence;
        if (allPassed) {
          verifiedEvidence = await this.recordVerifiedEvidence(userId, 'skill_javascript', 0.95);
        }

        return {
          passed: allPassed,
          message: allPassed ? 'All test cases passed! Async concurrency bounded correctly.' : 'Some test assertions failed.',
          executionTimeMs: Date.now() - startTime,
          testResults,
          verifiedEvidence
        };
      }
    } catch (err: any) {
      return {
        passed: false,
        message: `${err && err.message ? 'Runtime Error: ' + err.message : 'Runtime Error: execution timed out or was interrupted.'}`,
        executionTimeMs: Date.now() - startTime
      };
    }

    return {
      passed: false,
      message: 'Unknown challenge ID.',
      executionTimeMs: Date.now() - startTime
    };
  }

  /** Evaluate a model/curated JS challenge against its generic test cases. */
  private async runDynamicJs(
    chall: GeneratedChallenge,
    userCode: string,
    userId: string,
    startTime: number,
    timeoutMs: number
  ): Promise<ExecutionResult> {
    const fn = this.getDynamicFunction(userCode, timeoutMs);
    if (!fn) {
      return {
        passed: false,
        message:
          'Could not find a function to test. Ensure your code defines the requested function.',
        executionTimeMs: Date.now() - startTime
      };
    }

    const testCases = chall.testCases || [];
    const testResults: Array<{ testName: string; passed: boolean; expected: any; actual: any }> = [];
    let allPassed = true;

    for (const tc of testCases) {
      try {
        const args = safeParse(tc.input);
        const expected = safeParse(tc.expected);
        const actual = await withTimeout(fn(...(Array.isArray(args) ? args : [args])), timeoutMs);
        const pass = deepEqual(actual, expected);
        testResults.push({ testName: tc.name || 'Test', passed: pass, expected, actual });
        if (!pass) allPassed = false;
      } catch (err: any) {
        testResults.push({
          testName: tc.name || 'Test',
          passed: false,
          expected: safeParse(tc.expected),
          actual: `Error: ${err?.message || 'runtime error'}`
        });
        allPassed = false;
      }
    }

    let verifiedEvidence;
    if (allPassed && testResults.length > 0) {
      verifiedEvidence = await this.recordVerifiedEvidence(userId, chall.skillId, 0.9);
    }

    return {
      passed: allPassed,
      message: allPassed
        ? 'All test cases passed!'
        : `${testResults.filter(t => !t.passed).length} of ${testResults.length} test cases failed.`,
      executionTimeMs: Date.now() - startTime,
      testResults,
      verifiedEvidence
    };
  }

  /**
   * Evaluate generic user code inside a VM, returning the first function it
   * defines (by name) so it can be invoked against test cases.
   */
  private getDynamicFunction(code: string, timeoutMs: number): ((...args: any[]) => any) | undefined {
    const sandboxGlobals = {
      Promise,
      setTimeout,
      clearTimeout,
      console,
      Math,
      Number,
      String,
      Array,
      Object,
      Boolean,
      JSON,
      Symbol,
      Error,
      Date,
      RegExp
    };
    const context = vm.createContext(Object.assign(Object.create(null), sandboxGlobals));
    const script = new vm.Script(code);
    script.runInContext(context, { timeout: timeoutMs });

    const name = detectFunctionName(code);
    if (!name) return undefined;
    const probe = new vm.Script(`${code}\n;${name};`);
    const candidate = probe.runInContext(context, { timeout: timeoutMs });
    return typeof candidate === 'function' ? candidate : undefined;
  }

  /**
   * Evaluates candidate code inside a Node VM context that exposes only a safe
   * subset of globals, and returns the exported `batchMap` function reference.
   */
  private runUserFunction(code: string, timeoutMs: number): ((...args: any[]) => any) | undefined {
    const sandboxGlobals = {
      Promise,
      setTimeout,
      clearTimeout,
      console,
      Math,
      Number,
      String,
      Array,
      Object,
      Boolean,
      JSON,
      Symbol,
      Error,
      Date,
      RegExp
    };

    const context = vm.createContext(Object.assign(Object.create(null), sandboxGlobals));
    const script = new vm.Script(`${code}\n;batchMap;`);
    const candidate = script.runInContext(context, { timeout: timeoutMs });
    if (typeof candidate !== 'function') {
      return undefined;
    }
    return candidate;
  }

  private async recordVerifiedEvidence(userId: string, skillId: string, proficiency: number): Promise<SkillEvidence> {
    const userEvidence = await store.getEvidence(userId);
    const existingIdx = userEvidence.findIndex(e => e.skillId === skillId && e.sourceType === 'ASSESSMENT');

    const newEv: SkillEvidence = {
      id: `ev_sandbox_${Date.now()}_${skillId}`,
      userId,
      skillId,
      sourceType: 'ASSESSMENT',
      sourceId: 'sandbox_practical_execution',
      proficiencyScore: proficiency,
      confidence: 'HIGH',
      metadata: { practicalTaskVerified: true },
      createdAt: new Date().toISOString()
    };

    if (existingIdx >= 0) {
      userEvidence[existingIdx] = newEv;
    } else {
      userEvidence.push(newEv);
    }

    await store.saveEvidence(userId, userEvidence);

    // Recompute gaps with newly elevated practical score
    await gapService.calculateGaps(userId, 'role_junior_backend');

    return newEv;
  }
}

function normalizeValue(value: any): any {
  if (typeof value === 'number') {
    return Math.round(value * 100) / 100;
  }
  if (value instanceof Uint8Array) {
    return Array.from(value);
  }
  return value;
}

function normalizeRows(rows: any[]): Array<Record<string, any>> {
  return rows.map(row => {
    const out: Record<string, any> = {};
    for (const key of Object.keys(row)) {
      out[key] = normalizeValue(row[key]);
    }
    return out;
  });
}

let sqlJsPromise: Promise<SqlJsStatic> | null = null;

function getSqlJs(): Promise<SqlJsStatic> {
  if (!sqlJsPromise) {
    // Locate the WASM binary shipped with sql.js, regardless of CJS/ESM loader.
    let wasmPath = '';
    try {
      wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm');
    } catch {
      wasmPath = '';
    }
    sqlJsPromise = initSqlJs({
      locateFile: () => wasmPath || 'sql-wasm.wasm'
    });
  }
  return sqlJsPromise;
}

async function runInMemoryDb(schemaSql: string, seedSql: string): Promise<Database> {
  const SQL = await getSqlJs();
  const db = new SQL.Database();
  db.run(schemaSql);
  db.run(seedSql);
  return db;
}

function mapResult(db: Database, sql: string): any[] {
  const results = db.exec(sql);
  if (!results || results.length === 0) {
    return [];
  }
  const { columns, values } = results[0];
  return values.map(row => {
    const obj: Record<string, any> = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj;
  });
}

function rowsMatch(expected: Array<Record<string, any>>, actual: Array<Record<string, any>>): boolean {
  if (expected.length !== actual.length) {
    return false;
  }
  for (let i = 0; i < expected.length; i++) {
    const e = expected[i];
    const a = actual[i];
    const eKeys = Object.keys(e).sort();
    const aKeys = Object.keys(a).sort();
    if (JSON.stringify(eKeys) !== JSON.stringify(aKeys)) {
      return false;
    }
    for (const key of eKeys) {
      if (JSON.stringify(a[key]) !== JSON.stringify(e[key])) {
        return false;
      }
    }
  }
  return true;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Execution timed out')), ms);
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

export const sandboxService = new SandboxService();

function safeParse(raw: string | undefined): any {
  if (raw === undefined || raw === null || raw === '') return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    return a.every((_, i) => deepEqual(a[i], b[i]));
  }
  if (typeof a === 'object') {
    const aKeys = Object.keys(a).sort();
    const bKeys = Object.keys(b).sort();
    if (JSON.stringify(aKeys) !== JSON.stringify(bKeys)) return false;
    return aKeys.every(k => deepEqual(a[k], b[k]));
  }
  return a === b;
}

function detectFunctionName(code: string): string | null {
  const decl = code.match(/(?:function|async function)\s+([A-Za-z_$][\w$]*)\s*\(/);
  if (decl) return decl[1];
  const arrow = code.match(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(/);
  if (arrow) return arrow[1];
  const arrowNamed = code.match(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?([A-Za-z_$][\w$]*)\s*=>/);
  if (arrowNamed) return arrowNamed[1];
  return null;
}

function toSandboxChallenge(c: GeneratedChallenge): SandboxChallenge {
  return {
    id: c.id,
    title: c.title,
    type: c.type,
    skillId: c.skillId,
    difficulty: c.difficulty,
    description: c.description,
    starterCode: c.starterCode,
    schemaPreview: c.schemaPreview,
    sampleDataDescription: c.sampleDataDescription,
    testCasesCount: c.testCases ? c.testCases.length : 0
  };
}
