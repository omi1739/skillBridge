import { SkillEvidence } from '@skillbridge/types';
import * as vm from 'vm';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { store } from '../store';
import { gapService } from './gap.service';
import {
  GeneratedChallenge,
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

const SQL_FIXTURES: Record<string, SqlFixture> = {};

export class SandboxService {
  private challenges: SandboxChallenge[] = [];

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
      const dyn = getDynamicChallenge(challengeId);
      if (dyn && dyn.type === 'JAVASCRIPT' && dyn.testCases && dyn.testCases.length > 0) {
        return await this.runDynamicJs(dyn, userCode, userId, startTime, timeoutMs);
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
    const roleId = await store.getTargetRoleId(userId);
    await gapService.calculateGaps(userId, roleId);

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
