import { SkillEvidence } from '@skillbridge/types';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { spawn } from 'child_process';
import { tmpdir } from 'os';
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
   * Deterministic JS challenge evaluation in a hardened subprocess.
   *
   * The user's code runs inside a freshly spawned Node child process that has no
   * access to the API's memory, store, env secrets, or event loop. The worker
   * evaluates it inside a VM realm with a hard script timeout, then the parent
   * force-kills the child if the whole job exceeds the deadline. This contains
   * both infinite/synchronous loops (which would otherwise hang the API event
   * loop — the old `withTimeout(fn(...))` after a `runInContext` call could not
   * interrupt plain synchronous `while(true){}` code) and any VM escape attempts
   * to a process without host resources.
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

  /**
   * Evaluate a model/curated JS challenge against its generic test cases inside
   * a throwaway subprocess. The worker is spawned once per submission (bounding
   * memory/cpu/time), given only the user code + test cases via stdin, and its
   * structured result is parsed back from stdout.
   */
  private async runDynamicJs(
    chall: GeneratedChallenge,
    userCode: string,
    userId: string,
    startTime: number,
    timeoutMs: number
  ): Promise<ExecutionResult> {
    // Cheap pre-scan is defense-in-depth only; real isolation comes from the OS
    // process boundary below, so a bypassing payload still gets nothing.
    if (userCode.length > 50_000 || SandboxService.ESCAPE_PATTERNS.some(re => re.test(userCode))) {
      return {
        passed: false,
        message:
          'Could not find a function to test. Ensure your code defines the requested function.',
        executionTimeMs: Date.now() - startTime
      };
    }

    const suite = await this.runJsWorker(userCode, chall.testCases!, timeoutMs);
    if (suite && suite.error) {
      const timedOut = /timed out|interrupt|did not exit|time limit/i.test(suite.error);
      return {
        passed: false,
        message: timedOut
          ? 'Execution timed out. Check for infinite loops in your solution.'
          : `Runtime Error: ${suite.error.slice(0, 200)}`,
        executionTimeMs: Date.now() - startTime
      };
    }

    const testResults = suite?.testResults || [];
    const allPassed = suite ? suite.allPassed === true && testResults.length > 0 : false;

    let verifiedEvidence;
    if (allPassed) {
      verifiedEvidence = await this.recordVerifiedEvidence(userId, chall.skillId, 0.9);
    }

    return {
      passed: allPassed,
      message: allPassed
        ? 'All test cases passed!'
        : `${testResults.filter((t: any) => !t.passed).length} of ${testResults.length} test cases failed.`,
      executionTimeMs: Date.now() - startTime,
      testResults: testResults.map((t: any) => ({
        testName: t.testName,
        passed: !!t.passed,
        expected: t.expected,
        actual: t.actual
      })),
      verifiedEvidence
    };
  }

  /**
   * Stop user code from reaching the host at all: spawn a bare Node worker with
   * minimal stdin/stdout only, no inherited env, no cwd access to the repo, and
   * hard-kill it if the deadline passes. The worker itself re-runs the code in a
   * VM realm so even a runaway script cannot touch the worker's own globals.
   */
  private runJsWorker(code: string, testCases: Array<{ name?: string; input: string; expected: string }>, timeoutMs: number): Promise<{
    allPassed?: boolean;
    testResults?: Array<{ testName: string; passed: boolean; expected: any; actual: any }>;
    error?: string;
  }> {
    const stdinPayload = JSON.stringify({ code, testCases, timeoutMs: timeoutMs - 500 });
    const durationMs = timeoutMs + 1500; // grace for spawn + vm compile + kill latency

    return new Promise(resolve => {
      let settled = false;
      let forceKilled = false;
      const child = spawn(process.execPath, ['-e', SandboxService.JS_WORKER], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { PATH: process.env.PATH || '' },
        cwd: tmpdir(),
        windowsHide: true
      });

      const finish = (payload: any) => {
        if (settled) return;
        settled = true;
        try {
          // eslint-disable-next-line no-caller
          child.stdin && child.stdin.destroy();
        } catch {
          /* already closed */
        }
        resolve(payload);
      };

      const killTimer = setTimeout(() => {
        forceKilled = true;
        try {
          child.kill('SIGKILL');
        } catch {
          /* already gone */
        }
      }, durationMs);

      let out = '';
      child.stdout.on('data', d => {
        out += d.toString();
        if (out.length > 64 * 1024) {
          forceKilled = true;
          try {
            child.kill('SIGKILL');
          } catch {
            /* noop */
          }
        }
      });

      child.on('error', err => {
        clearTimeout(killTimer);
        finish({ error: err.message || 'Worker failed to start.' });
      });

      child.on('exit', codeExit => {
        clearTimeout(killTimer);
        if (forceKilled) {
          finish({ error: 'Worker did not finish within the time limit (possible infinite loop).' });
          return;
        }
        if (codeExit !== 0 && !out.trim()) {
          finish({ error: 'Worker exited unexpectedly.' });
          return;
        }
        try {
          const parsed = JSON.parse(out.trim());
          finish(parsed);
        } catch {
          finish({ error: 'Worker produced no structured result.' });
        }
      });

      try {
        child.stdin.write(stdinPayload);
      } catch (err: any) {
        clearTimeout(killTimer);
        finish({ error: err?.message || 'Failed to send code to worker.' });
        return;
      }
      child.stdin.end();
    });
  }

  /**
   * Self-contained worker script. Read-only: it receives { code, testCases,
   * timeoutMs } on stdin, executes user code inside a VM realm (no host globals),
   * and prints a single JSON object on stdout. It never touches the host
   * filesystem, network, or environment beyond what Node itself provides.
   */
  private static readonly JS_WORKER = `
    'use strict';
    const vm = require('vm');
    let body = '';
    process.stdin.setEncoding('utf8');
    const run = async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const result = await SandboxWorker.evaluate(payload);
        process.stdout.write(JSON.stringify(result));
        process.exit(0);
      } catch (e) {
        process.stdout.write(JSON.stringify({ error: String((e && e.message) || e) }));
        process.exit(1);
      }
    };
    process.stdin.on('data', (c) => { body += c; });
    process.stdin.on('end', () => { run(); });

    const SandboxWorker = {
      async evaluate(payload) {
        const code = String(payload.code || '');
        const testCases = Array.isArray(payload.testCases) ? payload.testCases : [];
        const timeoutMs = Number(payload.timeoutMs) || 3000;

        const context = vm.createContext(Object.create(null));
        try {
          const logs = [];
          const fmt = (v) => { try { return JSON.stringify(v); } catch { return String(v); } };
          const make = (level) => (...a) => logs.push(level + ': ' + a.map(fmt).join(' '));
          context.console = { log: make('LOG'), warn: make('WARN'), error: make('ERROR'), info: make('INFO') };
        } catch {
          /* console is best-effort only */
        }
        try {
          new vm.Script(code).runInContext(context, { timeout: timeoutMs });
        } catch (e) {
          return { error: String((e && e.message) || e) };
        }
        const name = detectFunctionName(code);
        if (!name) return { error: 'No function definition found.' };

        let fn;
        try {
          const probe = new vm.Script(code + ';' + name + ';');
          fn = probe.runInContext(context, { timeout: timeoutMs });
        } catch (e) {
          return { error: String((e && e.message) || e) };
        }
        if (typeof fn !== 'function') return { error: 'Requested function is not a function.' };

        const testResults = [];
        let allPassed = true;
        for (const tc of testCases) {
          try {
            const args = safeParse(tc.input);
            const expected = safeParse(tc.expected);
            const actual = await callWithTimeout(fn, args, timeoutMs);
            const passed = deepEqual(actual, expected);
            testResults.push({ testName: tc.name || 'Test', passed, expected, actual });
            if (!passed) allPassed = false;
          } catch (e) {
            testResults.push({
              testName: tc.name || 'Test',
              passed: false,
              expected: safeParse(tc.expected),
              actual: 'Error: ' + ((e && e.message) || 'runtime error')
            });
            allPassed = false;
          }
        }
        return { allPassed, testResults };
      }
    };

    function safeParse(raw) {
      if (raw === undefined || raw === null || raw === '') return undefined;
      try { return JSON.parse(raw); } catch { return raw; }
    }
    function deepEqual(a, b) {
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
    function callWithTimeout(fn, args, timeoutMs) {
      let result;
      let done = false;
      const timer = setTimeout(() => {
        if (!done) throw new Error('Execution timed out');
      }, timeoutMs);
      try {
        const promise = fn.apply(null, Array.isArray(args) ? args : [args]);
        if (promise && typeof promise.then === 'function') {
          return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Execution timed out')), timeoutMs))
          ]).finally(() => { clearTimeout(timer); done = true; });
        }
        result = promise;
      } finally {
        clearTimeout(timer);
        done = true;
      }
      return result;
    }
    function detectFunctionName(code) {
      const decl = code.match(/(?:function|async function)\\s+([A-Za-z_$][\\w$]*)\\s*\\(/);
      if (decl) return decl[1];
      const arrow = code.match(/(?:const|let|var)\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*(?:async\\s*)?\\(/);
      if (arrow) return arrow[1];
      const arrowNamed = code.match(/(?:const|let|var)\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*(?:async\\s*)?([A-Za-z_$][\\w$]*)\\s*=>/);
      if (arrowNamed) return arrowNamed[1];
      return null;
    }
  `;

  /**
   * Static pre-scan for known escape/infinite-loop primitives. This is
   * defense-in-depth ONLY — the real security boundary is the throwaway
   * subprocess (no env secrets, no repo cwd, no API state, hard SIGKILL).
   * The blocklist rejects the common probes early so they never even spawn a
   * worker; anything that slips past still runs inside an expendable process.
   */
  private static readonly ESCAPE_PATTERNS: RegExp[] = [
    /__proto__/,
    /constructor\s*\.\s*constructor/,
    /\brequire\s*\(/,
    /\bimport\s*\(/,
    /\bprocess\b/,
    /\bglobalThis\b/,
    /\bBuffer\b/,
    /\bmodule\b/,
    /\beval\s*\(/,
    /\bFunction\s*\(/
  ];

  private async recordVerifiedEvidence(userId: string, skillId: string, proficiency: number): Promise<SkillEvidence> {
    const userEvidence = await store.getEvidence(userId);
    const existingIdx = userEvidence.findIndex(e => e.skillId === skillId && e.sourceType === 'ASSESSMENT');

    // A practical sandbox pass is credible evidence, but it must never erase a
    // higher score from a real assessment — keep the best demonstrated score.
    const existingAssessment = existingIdx >= 0 ? userEvidence[existingIdx].proficiencyScore : 0;
    const score = Math.max(existingAssessment, proficiency);

    const newEv: SkillEvidence = {
      id: `ev_sandbox_${Date.now()}_${skillId}`,
      userId,
      skillId,
      sourceType: 'ASSESSMENT',
      sourceId: 'sandbox_practical_execution',
      proficiencyScore: score,
      confidence: 'HIGH',
      metadata: { practicalTaskVerified: true, sourceProficiency: proficiency },
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
