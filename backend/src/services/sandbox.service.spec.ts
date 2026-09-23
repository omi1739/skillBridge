import { SandboxService } from './sandbox.service';
import { store } from '../store';
import { GeneratedChallenge, registerDynamicChallenge, getOfflineChallenges } from './challenge-generator.service';

jest.mock('../store', () => ({
  store: {
    getEvidence: jest.fn(),
    saveEvidence: jest.fn(),
    getTargetRoleId: jest.fn().mockResolvedValue('role_junior_backend')
  }
}));

jest.mock('./gap.service', () => ({
  gapService: { calculateGaps: jest.fn().mockResolvedValue([]) }
}));

const mockedStore = store as jest.Mocked<typeof store>;

describe('SandboxService', () => {
  const service = new SandboxService();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedStore.getEvidence.mockResolvedValue([]);
    mockedStore.saveEvidence.mockResolvedValue([]);
  });

  describe('getChallenges', () => {
    it('ships the curated offline bank and merges registered dynamic challenges', () => {
      const before = service.getChallenges();
      // Offline bank is registered eagerly so the sandbox is usable out of the box.
      expect(before.length).toBe(getOfflineChallenges().length);

      const dyn: GeneratedChallenge = {
        id: 'gen_sql_live_1',
        title: 'Live Generated Challenge',
        type: 'SQL',
        skillId: 'skill_sql',
        difficulty: 'Intermediate',
        description: 'A live generated challenge',
        starterCode: 'SELECT 1;',
        referenceSolution: 'SELECT 1;',
        schemaSql: 'CREATE TABLE t (id INT);',
        seedSql: 'INSERT INTO t VALUES (1);',
        referenceQuery: 'SELECT * FROM t;'
      };
      registerDynamicChallenge(dyn);
      const after = service.getChallenges();
      expect(after.map(c => c.id)).toContain('gen_sql_live_1');
    });
  });

  describe('executeSQL', () => {
    it('rejects unknown challenge IDs with no static fixtures', async () => {
      const result = await service.executeSQL('challenge_sql_01', 'SELECT * FROM employees', 'user_1');
      expect(result.passed).toBe(false);
      expect(result.message).toMatch(/Unknown challenge/i);
    });

    it('evaluates a dynamically registered SQL challenge against its seed/reference', async () => {
      const dyn: GeneratedChallenge = {
        id: 'gen_sql_live_2',
        title: 'Live SQL',
        type: 'SQL',
        skillId: 'skill_sql',
        difficulty: 'Beginner',
        description: 'Select rows',
        starterCode: '',
        referenceSolution: 'SELECT * FROM t;',
        schemaSql: 'CREATE TABLE t (id INT);',
        seedSql: 'INSERT INTO t VALUES (1), (2);',
        referenceQuery: 'SELECT * FROM t;'
      };
      registerDynamicChallenge(dyn);

      const result = await service.executeSQL('gen_sql_live_2', 'SELECT * FROM t;', 'user_1');
      expect(result.passed).toBe(true);
      expect(result.outputRows).toBeDefined();
      expect(result.outputRows!.length).toBe(2);
      expect(mockedStore.saveEvidence).toHaveBeenCalled();
    });
  });

  describe('executeJavaScript', () => {
    it('rejects unknown challenge IDs with no static challenges', async () => {
      const result = await service.executeJavaScript('challenge_js_01', 'const x = 1;', 'user_1');
      expect(result.passed).toBe(false);
      expect(result.message).toMatch(/Unknown challenge/i);
    });

    it('passes a dynamically registered JS challenge with a correct implementation', async () => {
      const dyn: GeneratedChallenge = {
        id: 'gen_js_live_1',
        title: 'Live JS',
        type: 'JAVASCRIPT',
        skillId: 'skill_javascript',
        difficulty: 'Beginner',
        description: 'Double evens',
        starterCode: '',
        referenceSolution: '',
        testCases: [
          { name: 'Doubles evens', input: '[[1,2,3,4]]', expected: '[4,8]' }
        ]
      };
      registerDynamicChallenge(dyn);

      const result = await service.executeJavaScript(
        'gen_js_live_1',
        'async function doubleEvens(arr){ return arr.filter(x => x % 2 === 0).map(x => x * 2); }',
        'user_1'
      );
      expect(result.passed).toBe(true);
      expect(result.testResults).toBeDefined();
      expect(result.verifiedEvidence).toBeDefined();
      expect(mockedStore.saveEvidence).toHaveBeenCalled();
    });

    it('fails when a dynamic JS challenge implementation is incorrect', async () => {
      const dyn: GeneratedChallenge = {
        id: 'gen_js_live_2',
        title: 'Live JS 2',
        type: 'JAVASCRIPT',
        skillId: 'skill_javascript',
        difficulty: 'Beginner',
        description: 'Double evens',
        starterCode: '',
        referenceSolution: '',
        testCases: [
          { name: 'Doubles evens', input: '[[1,2,3,4]]', expected: '[4,8]' }
        ]
      };
      registerDynamicChallenge(dyn);

      const result = await service.executeJavaScript('gen_js_live_2', 'async function doubleEvens(a){ return a; }', 'user_1');
      expect(result.passed).toBe(false);
      expect(mockedStore.saveEvidence).not.toHaveBeenCalled();
    });

    it('blocks constructor-chain VM escape attempts via the static pre-scan', async () => {
      const dyn: GeneratedChallenge = {
        id: 'gen_js_escape_1',
        title: 'Escape probe',
        type: 'JAVASCRIPT',
        skillId: 'skill_javascript',
        difficulty: 'Beginner',
        description: 'Escape probe',
        starterCode: '',
        referenceSolution: '',
        testCases: [{ name: 'T1', input: '[]', expected: '[]' }]
      };
      registerDynamicChallenge(dyn);

      const payload = 'async function pwn() { Object.constructor("return process")().exit(); }';
      const result = await service.executeJavaScript('gen_js_escape_1', payload, 'user_1');
      expect(result.passed).toBe(false);
      expect(mockedStore.saveEvidence).not.toHaveBeenCalled();
    });

    it('blocks process/require access even inside a single-function payload', async () => {
      const dyn: GeneratedChallenge = {
        id: 'gen_js_escape_2',
        title: 'Escape probe 2',
        type: 'JAVASCRIPT',
        skillId: 'skill_javascript',
        difficulty: 'Beginner',
        description: 'Escape probe 2',
        starterCode: '',
        referenceSolution: '',
        testCases: [{ name: 'T1', input: '[]', expected: '[]' }]
      };
      registerDynamicChallenge(dyn);

      const payload = 'async function pwn() { globalThis.process.exit(); }';
      const result = await service.executeJavaScript('gen_js_escape_2', payload, 'user_1');
      expect(result.passed).toBe(false);
      expect(mockedStore.saveEvidence).not.toHaveBeenCalled();
    });

    it('hard-kills a synchronous infinite loop instead of hanging the event loop', async () => {
      registerDynamicChallenge({
        id: 'gen_js_loop_probe',
        title: 'Loop probe',
        type: 'JAVASCRIPT',
        skillId: 'skill_javascript',
        difficulty: 'Beginner',
        description: 'x',
        starterCode: '',
        referenceSolution: '',
        testCases: [{ name: 'T', input: '[]', expected: '[]' }]
      });

      const started = Date.now();
      const result = await service.executeJavaScript(
        'gen_js_loop_probe',
        'function f(){ while(true){} }',
        'user_1'
      );
      const elapsed = Date.now() - started;

      expect(result.passed).toBe(false);
      expect(result.message).toMatch(/timed out/i);
      expect(elapsed).toBeLessThan(15000);
      expect(mockedStore.saveEvidence).not.toHaveBeenCalled();
    }, 20000);

    it('executes normally after a prior loop was killed (proc never leaks)', async () => {
      registerDynamicChallenge({
        id: 'gen_js_loop_probe_2',
        title: 'Loop probe 2',
        type: 'JAVASCRIPT',
        skillId: 'skill_javascript',
        difficulty: 'Beginner',
        description: 'x',
        starterCode: '',
        referenceSolution: '',
        testCases: [{ name: 'T', input: '[]', expected: '[1]' }]
      });

      const good = await service.executeJavaScript('gen_js_loop_probe_2', 'function f(){ return [1]; }', 'user_1');
      expect(good.passed).toBe(true);
    }, 20000);
  });
});